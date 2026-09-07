import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

// Security middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';

import authRoutes from './routes/auth.routes';
import eventRoutes from './routes/event.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import organizerRoutes from './routes/organizer.routes';

import { errorHandler } from './middlewares/error.middleware';

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Webhook endpoint needs raw body, so we mount it before express.json()
app.use('/api/payments', paymentRoutes);

// For now, parse JSON for all other endpoints
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizer', organizerRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'EventHub API is running',
  });
});

// Basic 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Not Found' });
});

// Global error handler
app.use(errorHandler);

export default app;
