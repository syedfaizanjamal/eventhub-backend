import prisma from '../config/prisma';

export const getAllEvents = async (page: number, limit: number, search?: string) => {
  const skip = (page - 1) * limit;

  const whereClause = search
    ? {
        title: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }
    : {};

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
  if (!event) throw new Error('Event not found');
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

export const updateEvent = async (id: string, data: any, userId: string, role: string) => {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new Error('Event not found');

  if (role === 'ORGANIZER' && event.organizerId !== userId) {
    throw new Error('Forbidden: You can only update your own events');
  }

  // Handle totalSeats update: ensure new total is not less than already booked
  if (data.totalSeats !== undefined && data.totalSeats !== event.totalSeats) {
    const bookedSeats = event.totalSeats - event.availableSeats;
    if (data.totalSeats < bookedSeats) {
      throw new Error('Cannot reduce total seats below already booked seats');
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

export const deleteEvent = async (id: string, userId: string, role: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { bookings: true },
  });

  if (!event) throw new Error('Event not found');

  if (role === 'ORGANIZER' && event.organizerId !== userId) {
    throw new Error('Forbidden: You can only delete your own events');
  }

  if (event.bookings.length > 0) {
    throw new Error('Conflict: Cannot delete an event that has bookings');
  }

  return await prisma.event.delete({
    where: { id },
  });
};
