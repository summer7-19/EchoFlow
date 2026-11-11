import { z } from 'zod'

export const eventStatusSchema = z.enum(['PENDING', 'COMPLETED', 'OVERDUE'])

export const createEventSchema = z.object({
  title: z.string().min(1).max(128),
  triggerTime: z.iso.datetime(),
  clueSegmentId: z.number().int().nonnegative().optional(),
  notifyOffset: z.number().int().min(0).max(10080).default(15),
})

export const updateEventSchema = z.object({ status: eventStatusSchema }).strict()
