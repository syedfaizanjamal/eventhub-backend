import Stripe from 'stripe';
import prisma from '../config/prisma';
import { sendBookingConfirmationEmail } from '../utils/email';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../constants';
import { AppError } from '../utils/appError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-08-26.dahlia',
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

/**
 * Handle Stripe incoming webhooks securely
 */
export const handleWebhook = async (rawBody: Buffer | string, signature?: string | string[]) => {
  if (!signature) {
    throw new AppError('No stripe-signature provided in headers', 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      Array.isArray(signature) ? signature[0] : signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    throw new AppError(`Webhook Error: ${err.message}`, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await processSuccessfulPayment(session.id);
  }

  return { received: true };
};

/**
 * Verify payment status via Stripe checkout session
 */
export const verifyPayment = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true, user: true, event: true },
  });

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (booking.status === BOOKING_STATUS.CONFIRMED) {
    return {
      success: true,
      message: 'Booking is already confirmed',
      data: booking,
    };
  }

  if (!booking.payment?.stripeSessionId) {
    throw new AppError('No Stripe payment session found for this booking', 400);
  }

  const session = await stripe.checkout.sessions.retrieve(booking.payment.stripeSessionId);

  if (session.payment_status === 'paid') {
    if (booking.payment.status === PAYMENT_STATUS.PENDING) {
      await processSuccessfulPayment(session.id);
    }

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { payment: true, event: true, user: true },
    });

    return {
      success: true,
      message: 'Payment verified successfully. Booking confirmed and seats updated.',
      data: updatedBooking,
    };
  }

  return {
    success: false,
    message: `Payment is not completed yet. Status: ${session.payment_status}`,
    data: {
      paymentStatus: session.payment_status,
      checkoutUrl: session.url,
    },
  };
};

/**
 * Shared transaction to mark payment SUCCESS, booking CONFIRMED,
 * decrement available seats, and trigger confirmation email.
 */
export const processSuccessfulPayment = async (stripeSessionId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId },
    include: { booking: { include: { user: true, event: true } } },
  });

  if (!payment || payment.status !== PAYMENT_STATUS.PENDING) {
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: PAYMENT_STATUS.SUCCESS },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: BOOKING_STATUS.CONFIRMED },
    }),
    prisma.event.update({
      where: { id: payment.booking.eventId },
      data: { availableSeats: { decrement: payment.booking.quantity } },
    }),
  ]);

  try {
    await sendBookingConfirmationEmail(
      payment.booking.user.email,
      payment.booking.user.name,
      payment.booking.event,
      payment.booking
    );
  } catch (emailErr) {
    console.error('Failed to send confirmation email from payment service:', emailErr);
  }
};
