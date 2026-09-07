import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    location: z.string().min(3, 'Location is required'),
    date: z.string().refine((val) => !isNaN(Date.parse(val)) && new Date(val) > new Date(), {
      message: 'Date must be a valid future date',
    }),
    price: z.number().min(0, 'Price must be greater than or equal to 0'),
    totalSeats: z.number().int().positive('Total seats must be greater than 0'),
    imageUrl: z.url('Must be a valid URL').optional().or(z.literal('')),
  }),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    location: z.string().min(3).optional(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)) && new Date(val) > new Date(), {
      message: 'Date must be a valid future date',
    }).optional(),
    price: z.number().min(0).optional(),
    totalSeats: z.number().int().positive().optional(),
    imageUrl: z.url().optional().or(z.literal('')),
  }),
});

export const eventQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    limit: z.string().regex(/^\d+$/).optional().default('10'),
    search: z.string().optional(),
  }),
});
