import { Router } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import adminRoutes from './admin.routes';
import organizerRoutes from './organizer.routes';

const router = Router();

// Sub-routes
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/organizer', organizerRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'EventHub API is running',
  });
});

export default router;
