import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createEventSchema, updateEventSchema, eventQuerySchema } from '../validations/event.validation';

const router = Router();

router.get('/', validate(eventQuerySchema), eventController.getEvents);
router.get('/:id', eventController.getEventById);

router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'ORGANIZER'),
  validate(createEventSchema),
  eventController.createEvent
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'ORGANIZER'),
  validate(updateEventSchema),
  eventController.updateEvent
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'ORGANIZER'),
  eventController.deleteEvent
);

export default router;
