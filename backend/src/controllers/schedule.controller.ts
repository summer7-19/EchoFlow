import type { RequestHandler } from 'express'
import type { Repository } from '../repositories/repository.js'
import { createEventSchema, updateEventSchema } from '../schemas/schedule.schema.js'
import { requireOwnedAudio } from '../services/audio.service.js'
import { createScheduleEvent, listScheduleEvents } from '../services/schedule.service.js'
import { scheduleReminder } from '../services/reminder.service.js'
import { HttpError } from '../utils/http-error.js'
import { currentUserId, routeParam } from '../utils/request-user.js'
import { sendSuccess } from '../utils/controller-response.js'

export const scheduleController = {
  list: (repository: Repository): RequestHandler => async (req, res) => {
    const audioId = typeof req.query.audioId === 'string' ? req.query.audioId : undefined
    const events = await listScheduleEvents(repository, currentUserId(req), audioId)
    return sendSuccess(req, res, events)
  },

  create: (repository: Repository): RequestHandler => async (req, res) => {
    const userId = currentUserId(req)
    const audio = await requireOwnedAudio(repository, routeParam(req, 'audioId'), userId)

    const input = createEventSchema.parse(req.body)
    const event = await createScheduleEvent(repository, audio.audioId, input)
    await scheduleReminder(event)

    return sendSuccess(req, res, event, 201)
  },

  update: (repository: Repository): RequestHandler => async (req, res) => {
    const input = updateEventSchema.parse(req.body)
    const event = await repository.updateEvent(routeParam(req, 'eventId'), input.status, currentUserId(req))
    if (!event) throw new HttpError(404, '找不到该日程', 'EVENT_NOT_FOUND')

    return sendSuccess(req, res, event)
  },
}
