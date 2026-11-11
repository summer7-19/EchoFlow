import type {
  AudioRecord,
  CreateEvent,
  ScenePayload,
  TimelineEvent,
  UserRecord,
} from '../models/types.js'

export interface Repository {
  listAudios(userId: string): Promise<AudioRecord[]>
  getAudio(id: string, userId?: string): Promise<AudioRecord | undefined>
  saveAudio(record: AudioRecord): Promise<void>
  deleteAudio(id: string, userId?: string): Promise<boolean>
  updateAudio(
    id: string,
    update: Partial<AudioRecord>,
    userId?: string,
  ): Promise<AudioRecord | undefined>

  getScene(audioId: string): Promise<ScenePayload | undefined>
  saveScene(scene: ScenePayload): Promise<void>

  listEvents(userId: string, audioId?: string): Promise<TimelineEvent[]>
  createEvent(audioId: string, data: CreateEvent): Promise<TimelineEvent>
  updateEvent(
    id: string,
    status: TimelineEvent['status'],
    userId: string,
  ): Promise<TimelineEvent | undefined>

  getUserByEmail(email: string): Promise<UserRecord | undefined>
  getUserByDisplayName(displayName: string): Promise<UserRecord | undefined>
  getUserById(id: string): Promise<UserRecord | undefined>
  createUser(user: UserRecord): Promise<void>
  updateUser(
    id: string,
    update: Partial<Pick<UserRecord, 'displayName' | 'avatarUrl' | 'passwordHash'>>
  ): Promise<UserRecord | undefined>
}
