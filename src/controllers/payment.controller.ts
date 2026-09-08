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
        try {
          await sendBookingConfirmationEmail(
            payment.booking.user.email,
            payment.booking.user.name,
            payment.booking.event,
            payment.booking
          );
        } catch (emailErr) {
          console.error('Failed to send confirmation email from webhook:', emailErr);
        }
      }
    } catch (error) {
      console.error('Error processing checkout.session.completed:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
      return;
    }
  }

  res.json({ received: true });
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  const bookingId = req.params.bookingId as string;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, user: true, event: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    if (booking.status === 'CONFIRMED') {
      res.json({
        success: true,
        message: 'Booking is already confirmed',
        data: booking,
      });
      return;
    }

    if (!booking.payment?.stripeSessionId) {
      res.status(400).json({ success: false, message: 'No Stripe payment session found for this booking' });
      return;
    }

    // Retrieve session from Stripe directly
    const session = await stripe.checkout.sessions.retrieve(booking.payment.stripeSessionId);

    if (session.payment_status === 'paid') {
      if (booking.payment.status === 'PENDING') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: booking.payment.id },
            data: { status: 'SUCCESS' },
          }),
          prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'CONFIRMED' },
          }),
          prisma.event.update({
            where: { id: booking.eventId },
            data: { availableSeats: { decrement: booking.quantity } },
          }),
        ]);

        try {
          await sendBookingConfirmationEmail(
            booking.user.email,
            booking.user.name,
            booking.event,
            booking
          );
        } catch (emailErr) {
          console.error('Failed to send confirmation email during verification:', emailErr);
        }
      }

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { payment: true, event: true },
      });

      res.json({
        success: true,
        message: 'Payment verified successfully. Booking confirmed and seats updated.',
        data: updatedBooking,
      });
    } else {
      res.json({
        success: false,
        message: `Payment is not completed yet. Status: ${session.payment_status}`,
        data: {
          paymentStatus: session.payment_status,
          checkoutUrl: session.url,
        },
      });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

