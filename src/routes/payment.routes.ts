import { Router } from 'express';
import express from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Stripe webhook requires raw body
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Verification endpoint to check Stripe status and confirm booking/decrement seats
router.get('/verify/:bookingId', paymentController.verifyPayment);
router.post('/verify/:bookingId', paymentController.verifyPayment);

export default router;

