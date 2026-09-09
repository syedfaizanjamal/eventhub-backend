import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { createBookingSchema, bookingQuerySchema } from '../validations/booking.validation';

const router = Router();

// All booking endpoints require authentication
router.use(authenticate);

router.post('/', validate(createBookingSchema), bookingController.createBooking);
router.get('/', validate(bookingQuerySchema), bookingController.getBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/cancel', bookingController.cancelBooking);

export default router;
