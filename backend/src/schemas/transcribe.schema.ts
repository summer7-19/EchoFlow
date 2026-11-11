import { z } from 'zod'

export const transcribeSchema = z.object({
  audioId: z.string().min(1),
  language: z.string().min(1).max(16).default('auto'),
})
