import Stripe from 'stripe';
import { BOOKING_STATUS, PAYMENT_STATUS, ROLES } from '../constants';
import prisma from '../config/prisma';
import { sendBookingCancellationEmail } from '../utils/email';
import { AppError } from '../utils/appError';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-08-26.dahlia',
});

export const createBooking = async (userId: string, data: { eventId: string; quantity: number }) => {
  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
  });

  if (!event) throw new AppError('Event not found', 404);
  if (event.date < new Date()) throw new AppError('Event date has already passed', 400);
  if (event.availableSeats < data.quantity) throw new AppError('Not enough seats available', 400);

  const totalAmount = event.price * data.quantity;

  const booking = await prisma.booking.create({
    data: {
      userId,
      eventId: event.id,
      quantity: data.quantity,
      totalAmount,
      status: BOOKING_STATUS.PENDING,
    },
  });

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${process.env.CLIENT_URL}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/bookings/cancel`,
    client_reference_id: booking.id,
    line_items: [
      {
        price_data: {
          currency: 'inr',
          product_data: {
            name: event.title,
          },
          unit_amount: Math.round(event.price * 100), // Stripe expects amounts in cents/paise
        },
        quantity: data.quantity,
      },
    ],
  });

  if (!session.id) {
    throw new AppError('Failed to create payment session', 500);
  }

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: totalAmount,
      currency: 'INR',
      status: PAYMENT_STATUS.PENDING,
      stripeSessionId: session.id,
    },
  });

  return {
    booking,
    checkoutUrl: session.url,
  };
};

export const getMyBookings = async (userId: string, page: number, limit: number, status?: any) => {
  const skip = (page - 1) * limit;

  const whereClause: any = { userId };
  if (status) {
    whereClause.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        event: {
          select: { id: true, title: true, date: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where: whereClause }),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getBookingById = async (id: string, user: { id: string; role: string }) => {
  const { id: userId, role } = user;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      event: true,
      payment: true,
    },
  });

  if (!booking) throw new AppError('Booking not found', 404);

  // ADMIN can view any booking. CUSTOMER can view their own.
  // ORGANIZER can view if the booking is for their event.
  if (role === ROLES.CUSTOMER && booking.userId !== userId) {
    throw new AppError('Forbidden: You can only view your own bookings', 403);
  }
  if (role === ROLES.ORGANIZER && booking.event.organizerId !== userId) {
    throw new AppError('Forbidden: You can only view bookings for your events', 403);
  }

  return booking;
};

export const cancelBooking = async (id: string, user: { id: string; role: string }) => {
  const { id: userId, role } = user;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { event: true, payment: true, user: true },
  });

  if (!booking) throw new AppError('Booking not found', 404);

  if (role === ROLES.CUSTOMER && booking.userId !== userId) {
    throw new AppError('Forbidden: You can only cancel your own bookings', 403);
  }
  if (role === ROLES.ORGANIZER) {
    throw new AppError('Forbidden: Organizers cannot cancel customer bookings', 403);
  }

  if (booking.status !== BOOKING_STATUS.CONFIRMED) {
    throw new AppError('Conflict: Only CONFIRMED bookings can be cancelled', 409);
  }

  if (booking.event.date < new Date()) {
    throw new AppError('Conflict: Cannot cancel booking after the event has started', 409);
  }

  // Trigger Stripe automatic refund if payment was successful
  if (booking.payment && booking.payment.status === PAYMENT_STATUS.SUCCESS && booking.payment.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(booking.payment.stripeSessionId);
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      if (paymentIntentId) {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
      }
    } catch (refundError: any) {
      console.error('Stripe refund failed:', refundError);
      throw new AppError(`Refund failed: ${refundError.message || 'Unable to process refund with Stripe'}`, 400);
    }
  }

  // Use a transaction to update payment to REFUNDED, cancel booking, and restore seats
  const transactionOperations: any[] = [];

  if (booking.payment) {
    transactionOperations.push(
      prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: PAYMENT_STATUS.REFUNDED },
      })
    );
  }

  transactionOperations.push(
    prisma.booking.update({
      where: { id },
      data: { status: BOOKING_STATUS.CANCELLED },
      include: { user: true, event: true, payment: true },
    })
  );

  transactionOperations.push(
    prisma.event.update({
      where: { id: booking.eventId },
      data: { availableSeats: { increment: booking.quantity } },
    })
  );

  const results = await prisma.$transaction(transactionOperations);
  const updatedBooking = booking.payment ? results[1] : results[0];

  try {
    await sendBookingCancellationEmail(
      updatedBooking.user.email,
      updatedBooking.user.name,
      updatedBooking.event,
      updatedBooking
    );
  } catch (emailErr) {
    console.error('Failed to send booking cancellation email:', emailErr);
  }

  return updatedBooking;
};

export const getManageBookings = async (
  user: { id: string; role: string },
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit;

  // If ORGANIZER, show bookings for their events only. If ADMIN, show all bookings.
  const whereClause: any = user.role === ROLES.ORGANIZER
    ? { event: { organizerId: user.id } }
    : {};

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true } },
        payment: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where: whereClause }),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
