import { z } from 'zod'

export const categorySchema = z.enum([
  'MEDICATION',
  'SOP',
  'QUIZ',
  'MEMO',
  'INTERVIEW',
  'TRANSCRIPT',
])

export const transcriptSegmentSchema = z
  .object({
    id: z.string().optional(),
    start: z.number().nonnegative(),
    end: z.number().positive(),
    text: z.string().min(1),
    speaker: z.string().optional(),
  })
  .refine(segment => segment.end >= segment.start, 'end must be >= start')

export const transcriptSchema = z.array(transcriptSegmentSchema).max(100_000)
