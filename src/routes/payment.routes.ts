import { Router } from 'express';
import express from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Stripe webhook requires raw body
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

export default router;
