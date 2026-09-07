import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { bookingQuerySchema } from '../validations/booking.validation';

const router = Router();

router.use(authenticate);
router.use(authorize('ORGANIZER'));

router.get('/bookings', validate(bookingQuerySchema), bookingController.getOrganizerBookings);

export default router;
