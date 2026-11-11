import { z } from 'zod'
import { categorySchema } from './audio.schema.js'

export const scenePayloadSchema = z.object({
  audioId: z.string().min(1),
  category: categorySchema,
  payload: z.record(z.string(), z.unknown()),
})
