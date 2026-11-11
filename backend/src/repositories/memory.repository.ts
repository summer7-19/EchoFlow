import { randomUUID } from 'node:crypto'
import type { Repository } from './repository.js'
import type {
  AudioRecord,
  CreateEvent,
  ScenePayload,
  TimelineEvent,
  UserRecord,
} from '../models/types.js'

export class MemoryRepository implements Repository {
  private readonly audios = new Map<string, AudioRecord>()
  private readonly scenes = new Map<string, ScenePayload>()
  private readonly events = new Map<string, TimelineEvent>()
  private readonly usersById = new Map<string, UserRecord>()

  async listAudios(userId: string) {
    return [...this.audios.values()].filter(audio => audio.userId === userId).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    )
  }

  async getAudio(id: string, userId?: string) {
    const audio = this.audios.get(id)
    return audio && (!userId || audio.userId === userId) ? audio : undefined
  }

  async saveAudio(record: AudioRecord) {
    this.audios.set(record.audioId, record)
  }

  async deleteAudio(id: string, userId?: string) {
    const record = await this.getAudio(id, userId)
    if (!record) return false

    this.audios.delete(id)
    this.scenes.delete(id)
    for (const [eventId, event] of this.events) {
      if (event.audioId === id) this.events.delete(eventId)
    }
    return true
  }

  async updateAudio(id: string, update: Partial<AudioRecord>, userId?: string) {
    const record = await this.getAudio(id, userId)
    if (!record) return undefined

    const updated = { ...record, ...update }
    this.audios.set(id, updated)
    return updated
  }

  async getScene(audioId: string) {
    return this.scenes.get(audioId)
  }

  async saveScene(scene: ScenePayload) {
    this.scenes.set(scene.audioId, scene)
  }

  async listEvents(userId: string, audioId?: string) {
    return [...this.events.values()]
      .filter(event => this.audios.get(event.audioId)?.userId === userId && (!audioId || event.audioId === audioId))
      .sort((left, right) => left.triggerTime.localeCompare(right.triggerTime))
  }

  async createEvent(audioId: string, data: CreateEvent) {
    const event: TimelineEvent = {
      id: randomUUID(),
      audioId,
      ...data,
      status: 'PENDING',
    }
    this.events.set(event.id, event)
    return event
  }

  async updateEvent(id: string, status: TimelineEvent['status'], userId: string) {
    const event = this.events.get(id)
    if (!event || this.audios.get(event.audioId)?.userId !== userId) return undefined

    const updated = { ...event, status }
    this.events.set(id, updated)
    return updated
  }

  async getUserByEmail(email: string) {
    return [...this.usersById.values()].find(user => user.email === email)
  }

  async getUserByDisplayName(displayName: string) {
    const normalizedName = displayName.toLowerCase()
    return [...this.usersById.values()].find(
      user => user.displayName.toLowerCase() === normalizedName,
    )
  }

  async getUserById(id: string) {
    return this.usersById.get(id)
  }

  async createUser(user: UserRecord) {
    const existingEmail = await this.getUserByEmail(user.email)
    const existingName = await this.getUserByDisplayName(user.displayName)
    if (existingEmail || existingName) {
      throw new Error('Duplicate user account')
    }

    this.usersById.set(user.id, user)
  }

  async updateUser(
    id: string,
    update: Partial<Pick<UserRecord, 'displayName' | 'avatarUrl' | 'passwordHash'>>
  ) {
    const user = this.usersById.get(id)
    if (!user) return undefined

    const updated = { ...user, ...update }
    this.usersById.set(id, updated)
    return updated
  }
}
