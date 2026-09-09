import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { createEventSchema, updateEventSchema, eventQuerySchema } from '../validations/event.validation';
import { ROLES } from '../constants';

const router = Router();

router.get('/', validate(eventQuerySchema), eventController.getEvents);
router.get('/:id', eventController.getEventById);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ORGANIZER),
  validate(createEventSchema),
  eventController.createEvent
);

router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ORGANIZER),
  validate(updateEventSchema),
  eventController.updateEvent
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ORGANIZER),
  eventController.deleteEvent
);

export default router;
