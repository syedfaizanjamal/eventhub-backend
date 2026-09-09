import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (optional, but good for clean seeding)
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  // Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@example.com',
      password,
      role: Role.ADMIN,
    },
  });

  const organizer = await prisma.user.create({
    data: {
      name: 'Event Organizer',
      email: 'organizer@example.com',
      password,
      role: Role.ORGANIZER,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'customer1@example.com',
      password,
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'customer2@example.com',
      password,
      role: Role.CUSTOMER,
    },
  });

  // Create Events
  const event1 = await prisma.event.create({
    data: {
      title: 'React Conference 2026',
      description: 'The biggest React conference of the year in Noida.',
      location: 'Noida Expo Center',
      date: new Date('2026-09-15T10:00:00Z'),
      price: 1500,
      totalSeats: 100,
      availableSeats: 100,
      organizerId: organizer.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Node.js Summit',
      description: 'Deep dive into Node.js, Express, and backend engineering.',
      location: 'Bangalore Tech Park',
      date: new Date('2026-10-20T09:00:00Z'),
      price: 2000,
      totalSeats: 50,
      availableSeats: 50,
      organizerId: organizer.id,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: 'TypeScript Workshop',
      description: 'Learn Advanced TypeScript for large scale applications.',
      location: 'Online',
      date: new Date('2026-11-05T14:00:00Z'),
      price: 500,
      totalSeats: 200,
      availableSeats: 200,
      organizerId: organizer.id,
    },
  });

  console.log('Seed data successfully inserted!');
  console.log('Admin:', admin.email);
  console.log('Organizer:', organizer.email);
  console.log('Customers:', customer1.email, customer2.email);
  console.log('Password for all users: password123');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
