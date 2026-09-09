import { z } from 'zod';
import { BOOKING_STATUS_VALUES } from '../constants';

export const createBookingSchema = z.object({
  body: z.object({
    eventId: z.uuid('Invalid event ID format'),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
  }),
});

export const bookingQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    limit: z.string().regex(/^\d+$/).optional().default('10'),
    status: z.enum(BOOKING_STATUS_VALUES).optional(),
  }),
});
