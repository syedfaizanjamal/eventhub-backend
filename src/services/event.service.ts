import prisma from '../config/prisma';
import { ROLES } from '../constants';
import { AppError } from '../utils/appError';

export const getAllEvents = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    isDeleted: false,
  };

  if (search) {
    whereClause.title = {
      contains: search,
      mode: 'insensitive' as const,
    };
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { date: 'asc' },
    }),
    prisma.event.count({ where: whereClause }),
  ]);

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getEventById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
  });
  if (!event || event.isDeleted) throw new AppError('Event not found', 404);
  return event;
};

export const createEvent = async (data: any, organizerId: string) => {
  return await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      location: data.location,
      date: new Date(data.date),
      price: data.price,
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats, // Initially equals totalSeats
      imageUrl: data.imageUrl,
      organizerId,
    },
  });
};

export const updateEvent = async (id: string, data: any, user: { id: string; role: string }) => {
  const { id: userId, role } = user;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event || event.isDeleted) throw new AppError('Event not found', 404);

  if (role === ROLES.ORGANIZER && event.organizerId !== userId) {
    throw new AppError('Forbidden: You can only delete your own events', 403);
  }

  // Handle totalSeats update: ensure new total is not less than already booked
  if (data.totalSeats !== undefined && data.totalSeats !== event.totalSeats) {
    const bookedSeats = event.totalSeats - event.availableSeats;
    if (data.totalSeats < bookedSeats) {
      throw new AppError('Cannot reduce total seats below already booked seats', 400);
    }
    data.availableSeats = data.totalSeats - bookedSeats;
  }

  if (data.date) {
    data.date = new Date(data.date);
  }

  return await prisma.event.update({
    where: { id },
    data,
  });
};

export const deleteEvent = async (id: string, user: { id: string; role: string }) => {
  const { id: userId, role } = user;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { bookings: true },
  });

  if (!event || event.isDeleted) throw new AppError('Event not found', 404);

  if (role === ROLES.ORGANIZER && event.organizerId !== userId) {
    throw new AppError('Forbidden: You can only delete your own events', 403);
  }

  if (event.bookings.length > 0) {
    throw new AppError('Conflict: Cannot delete an event that has bookings', 409);
  }

  return await prisma.event.update({
    where: { id },
    data: { isDeleted: true },
  });
};
