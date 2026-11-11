import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { randomUUID } from 'node:crypto'
import type { Repository } from './repository.js'
import type {
  AudioRecord,
  AudioStatus,
  Category,
  CreateEvent,
  ScenePayload,
  Segment,
  TimelineEvent,
  UserRecord,
} from '../models/types.js'

interface AudioRow extends RowDataPacket {
  audio_id: string
  user_id: string | null
  file_path: string
  original_name: string
  mime_type: string
  duration: number | null
  file_size: number
  status: AudioStatus
  category: Category | null
  transcript_json: Segment[] | string
  created_at: Date | string
  error_message: string | null
}

interface SceneRow extends RowDataPacket {
  audio_id: string
  category: Category
  payload_json: Record<string, unknown> | string
  updated_at: Date | string
}

interface EventRow extends RowDataPacket {
  event_id: string
  audio_id: string
  title: string
  trigger_time: Date | string
  status: TimelineEvent['status']
  clue_segment_id: number | null
  notify_offset: number
}

interface UserRow extends RowDataPacket {
  id: string
  email: string
  display_name: string
  password_hash: string
  avatar_url: string | null
  created_at: Date | string
}

const USER_FIELDS = 'id,email,display_name,password_hash,avatar_url,created_at'
const AUDIO_FIELDS =
  'audio_id,user_id,file_path,original_name,mime_type,duration,file_size,status,category,transcript_json,created_at,error_message'

const USER_COLUMNS = {
  displayName: 'display_name',
  avatarUrl: 'avatar_url',
  passwordHash: 'password_hash',
} as const

const AUDIO_COLUMNS = {
  filePath: 'file_path',
  originalName: 'original_name',
  mimeType: 'mime_type',
  duration: 'duration',
  fileSize: 'file_size',
  status: 'status',
  category: 'category',
  transcript: 'transcript_json',
  error: 'error_message',
} as const

type SqlValue = string | number | Date | Buffer | null

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString()
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  return new Date(normalized).toISOString()
}

function parseJson<T>(value: T | string): T {
  return typeof value === 'string' ? (JSON.parse(value) as T) : value
}

function hasOwn(object: object, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function buildUpdate(
  update: Record<string, unknown>,
  columns: Record<string, string>,
  transforms: Record<string, (value: unknown) => SqlValue> = {},
) {
  const sets: string[] = []
  const values: SqlValue[] = []

  for (const [key, column] of Object.entries(columns)) {
    if (!hasOwn(update, key)) continue

    sets.push(`${column}=?`)
    const transform = transforms[key]
    const value = update[key]
    values.push(transform ? transform(value) : ((value ?? null) as SqlValue))
  }

  return { sets, values }
}

function toAudio(row: AudioRow): AudioRecord {
  return {
    userId: row.user_id ?? '',
    audioId: row.audio_id,
    filePath: row.file_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    duration: row.duration,
    fileSize: Number(row.file_size),
    status: row.status,
    category: row.category,
    transcript: parseJson(row.transcript_json),
    createdAt: toIso(row.created_at),
    error: row.error_message ?? undefined,
  }
}

function toScene(row: SceneRow): ScenePayload {
  return {
    audioId: row.audio_id,
    category: row.category,
    payload: parseJson(row.payload_json),
    updatedAt: toIso(row.updated_at),
  }
}

function toEvent(row: EventRow): TimelineEvent {
  return {
    id: row.event_id,
    audioId: row.audio_id,
    title: row.title,
    triggerTime: toIso(row.trigger_time),
    status: row.status,
    clueSegmentId: row.clue_segment_id ?? undefined,
    notifyOffset: row.notify_offset,
  }
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url,
    createdAt: toIso(row.created_at),
  }
}

export class MysqlRepository implements Repository {
  constructor(private readonly pool: Pool) {}

  private async findUser(where: string, value: string) {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT ${USER_FIELDS} FROM users WHERE ${where} LIMIT 1`,
      [value],
    )
    return rows[0] ? toUser(rows[0]) : undefined
  }

  async getUserByEmail(email: string) {
    return this.findUser('email=?', email)
  }

  async getUserByDisplayName(displayName: string) {
    return this.findUser('LOWER(display_name)=LOWER(?)', displayName)
  }

  async getUserById(id: string) {
    return this.findUser('id=?', id)
  }

  async createUser(user: UserRecord) {
    await this.pool.execute(
      'INSERT INTO users (id,email,display_name,password_hash,avatar_url,created_at) VALUES (?,?,?,?,?,?)',
      [
        user.id,
        user.email,
        user.displayName,
        user.passwordHash,
        user.avatarUrl,
        new Date(user.createdAt),
      ],
    )
  }

  async updateUser(
    id: string,
    update: Partial<Pick<UserRecord, 'displayName' | 'avatarUrl' | 'passwordHash'>>,
  ) {
    const { sets, values } = buildUpdate(update, USER_COLUMNS)
    if (!sets.length) return this.getUserById(id)

    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE users SET ${sets.join(', ')} WHERE id=?`,
      [...values, id],
    )
    return result.affectedRows === 0 ? undefined : this.getUserById(id)
  }

  async listAudios(userId: string) {
    const [rows] = await this.pool.execute<AudioRow[]>(
      `SELECT ${AUDIO_FIELDS} FROM audio_records WHERE user_id=? ORDER BY created_at DESC`,
      [userId],
    )
    return rows.map(toAudio)
  }

  async getAudio(id: string, userId?: string) {
    const [rows] = userId
      ? await this.pool.execute<AudioRow[]>(
          `SELECT ${AUDIO_FIELDS} FROM audio_records WHERE audio_id=? AND user_id=? LIMIT 1`,
          [id, userId],
        )
      : await this.pool.execute<AudioRow[]>(
          `SELECT ${AUDIO_FIELDS} FROM audio_records WHERE audio_id=? LIMIT 1`,
          [id],
        )

    return rows[0] ? toAudio(rows[0]) : undefined
  }

  async saveAudio(record: AudioRecord) {
    await this.pool.execute(
      `INSERT INTO audio_records
        (audio_id,user_id,file_path,original_name,mime_type,duration,file_size,status,category,transcript_json,error_message,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        record.audioId,
        record.userId,
        record.filePath,
        record.originalName,
        record.mimeType,
        record.duration,
        record.fileSize,
        record.status,
        record.category,
        JSON.stringify(record.transcript),
        record.error ?? null,
        new Date(record.createdAt),
      ],
    )
  }

  async deleteAudio(id: string, userId?: string) {
    const [result] = userId
      ? await this.pool.execute<ResultSetHeader>(
          'DELETE FROM audio_records WHERE audio_id=? AND user_id=?',
          [id, userId],
        )
      : await this.pool.execute<ResultSetHeader>(
          'DELETE FROM audio_records WHERE audio_id=?',
          [id],
        )

    // scene_payloads 和 timeline_events 通过外键 ON DELETE CASCADE 一并删除。
    return result.affectedRows > 0
  }

  async updateAudio(id: string, update: Partial<AudioRecord>, userId?: string) {
    const { sets, values } = buildUpdate(update, AUDIO_COLUMNS, {
      transcript: value => (value === undefined ? null : JSON.stringify(value)),
    })
    if (!sets.length) return this.getAudio(id, userId)

    const where = userId ? 'audio_id=? AND user_id=?' : 'audio_id=?'
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE audio_records SET ${sets.join(', ')} WHERE ${where}`,
      userId ? [...values, id, userId] : [...values, id],
    )

    return result.affectedRows === 0 ? undefined : this.getAudio(id, userId)
  }

  async getScene(audioId: string) {
    const [rows] = await this.pool.execute<SceneRow[]>(
      'SELECT audio_id,category,payload_json,updated_at FROM scene_payloads WHERE audio_id=? LIMIT 1',
      [audioId],
    )
    return rows[0] ? toScene(rows[0]) : undefined
  }

  async saveScene(scene: ScenePayload) {
    await this.pool.execute(
      `INSERT INTO scene_payloads (audio_id,category,payload_json,updated_at)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE
         category=VALUES(category),
         payload_json=VALUES(payload_json),
         updated_at=VALUES(updated_at)`,
      [scene.audioId, scene.category, JSON.stringify(scene.payload), new Date(scene.updatedAt)],
    )
  }

  async listEvents(userId: string, audioId?: string) {
    const params = [userId]
    let filter = 'a.user_id=?'
    if (audioId) {
      filter += ' AND e.audio_id=?'
      params.push(audioId)
    }

    const [rows] = await this.pool.execute<EventRow[]>(
      `SELECT e.* FROM timeline_events e
       INNER JOIN audio_records a ON a.audio_id = e.audio_id
       WHERE ${filter}
       ORDER BY e.trigger_time`,
      params,
    )
    return rows.map(toEvent)
  }

  async createEvent(audioId: string, data: CreateEvent) {
    const id = randomUUID()
    const triggerTime = new Date(data.triggerTime)

    await this.pool.execute(
      `INSERT INTO timeline_events
        (event_id,audio_id,title,trigger_time,status,clue_segment_id,notify_offset)
       VALUES (?,?,?,?,?,?,?)`,
      [
        id,
        audioId,
        data.title,
        triggerTime,
        'PENDING',
        data.clueSegmentId ?? null,
        data.notifyOffset,
      ],
    )

    return {
      id,
      audioId,
      title: data.title,
      triggerTime: triggerTime.toISOString(),
      status: 'PENDING' as const,
      clueSegmentId: data.clueSegmentId,
      notifyOffset: data.notifyOffset,
    }
  }

  async updateEvent(id: string, status: TimelineEvent['status'], userId: string) {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `UPDATE timeline_events e
       INNER JOIN audio_records a ON a.audio_id = e.audio_id
       SET e.status=?
       WHERE e.event_id=? AND a.user_id=?`,
      [status, id, userId],
    )
    if (result.affectedRows === 0) return undefined

    const [rows] = await this.pool.execute<EventRow[]>(
      `SELECT e.* FROM timeline_events e
       INNER JOIN audio_records a ON a.audio_id = e.audio_id
       WHERE e.event_id=? AND a.user_id=? LIMIT 1`,
      [id, userId],
    )
    return rows[0] ? toEvent(rows[0]) : undefined
  }
}
