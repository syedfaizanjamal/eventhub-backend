import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../config/prisma';
import { sendBookingConfirmationEmail } from '../utils/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-08-26.dahlia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    if (!sig) throw new Error('No signature provided');
    // req.body should be the raw buffer here
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    try {
      const payment = await prisma.payment.findUnique({
        where: { stripeSessionId: session.id },
        include: { booking: { include: { user: true, event: true } } },
      });

      if (payment && payment.status === 'PENDING') {
        // Use a transaction to update payment, booking, and reduce available seats
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCESS' },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' },
          }),
          prisma.event.update({
            where: { id: payment.booking.eventId },
            data: { availableSeats: { decrement: payment.booking.quantity } },
          }),
        ]);
        
        // Send confirmation email
        await sendBookingConfirmationEmail(
          payment.booking.user.email,
          payment.booking.user.name,
          payment.booking.event,
          payment.booking
        );
      }
    } catch (error) {
      console.error('Error processing checkout.session.completed:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
      return;
    }
  }

  res.json({ received: true });
};
