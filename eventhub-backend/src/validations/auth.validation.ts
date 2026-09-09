import { z } from 'zod';
import { ROLES, ROLE_VALUES } from '../constants';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        'Password must be alphanumeric and contain at least one letter and one number'
      ),
    role: z.enum(ROLE_VALUES).optional().default(ROLES.CUSTOMER),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});
