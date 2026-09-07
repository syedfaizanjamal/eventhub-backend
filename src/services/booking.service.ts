import Stripe from 'stripe';
import prisma from '../config/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-08-26.dahlia',
});

export const createBooking = async (userId: string, data: { eventId: string; quantity: number }) => {
  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
  });

  if (!event) throw new Error('Event not found');
  if (event.date < new Date()) throw new Error('Event date has already passed');
  if (event.availableSeats < data.quantity) throw new Error('Not enough seats available');

  const totalAmount = event.price * data.quantity;

  const booking = await prisma.booking.create({
    data: {
      userId,
      eventId: event.id,
      quantity: data.quantity,
      totalAmount,
      status: 'PENDING',
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
    throw new Error('Failed to create payment session');
  }

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: totalAmount,
      currency: 'INR',
      status: 'PENDING',
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

export const getBookingById = async (id: string, userId: string, role: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      event: true,
      payment: true,
    },
  });

  if (!booking) throw new Error('Booking not found');

  // ADMIN can view any booking. CUSTOMER can view their own.
  // ORGANIZER can view if the booking is for their event.
  if (role === 'CUSTOMER' && booking.userId !== userId) {
    throw new Error('Forbidden: You can only view your own bookings');
  }
  if (role === 'ORGANIZER' && booking.event.organizerId !== userId) {
    throw new Error('Forbidden: You can only view bookings for your events');
  }

  return booking;
};

export const cancelBooking = async (id: string, userId: string, role: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!booking) throw new Error('Booking not found');

  if (role === 'CUSTOMER' && booking.userId !== userId) {
    throw new Error('Forbidden: You can only cancel your own bookings');
  }
  if (role === 'ORGANIZER') {
    throw new Error('Forbidden: Organizers cannot cancel customer bookings');
  }

  if (booking.status !== 'CONFIRMED') {
    throw new Error('Conflict: Only CONFIRMED bookings can be cancelled');
  }

  if (booking.event.date < new Date()) {
    throw new Error('Conflict: Cannot cancel booking after the event has started');
  }

  // Use a transaction to cancel booking and restore seats
  const [updatedBooking] = await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { user: true, event: true },
    }),
    prisma.event.update({
      where: { id: booking.eventId },
      data: { availableSeats: { increment: booking.quantity } },
    }),
  ]);

  return updatedBooking;
};

export const getAdminBookings = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true } },
        payment: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count(),
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

export const getOrganizerBookings = async (organizerId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const whereClause = {
    event: { organizerId },
  };

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
