# EventHub Backend

EventHub is a modern Event & Ticket Booking Platform backend built with Node.js, Express, TypeScript, and Prisma ORM. This backend is structured to be clean, readable, and practical, fulfilling the requirements for a full-stack code-submission project.

## Features

- **Authentication:** JWT-based user registration and login with bcrypt password hashing.
- **Role-Based Access Control:** Three user roles (`ADMIN`, `ORGANIZER`, `CUSTOMER`) with distinct permissions.
- **Event Management:** CRUD operations for events. Organizers can manage their events, and Admins can oversee all events.
- **Booking Flow:** Validation for seat availability, avoiding overselling.
- **Payments:** Stripe Test Mode integration with Checkout Sessions and Webhook handlers to confirm bookings after successful payment.
- **Email Service:** Nodemailer integration to send welcome emails, booking confirmations, and cancellation notices.
- **Validation & Error Handling:** Schema validation using Zod and a centralized global error handler.
- **Security:** Equipped with `helmet`, `cors`, and standardized API responses.

## Tech Stack

- **Runtime:** Node.js, Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Security:** JWT, bcrypt, Helmet, CORS, Zod
- **Payments:** Stripe (Test Mode)
- **Email:** Nodemailer

## Folder Structure

```
├── prisma/
│   ├── schema.prisma       # Database schema definition
│   └── seed.ts             # Database seeding script
├── src/
│   ├── config/             # Configuration files (e.g., Prisma instance)
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # Custom middlewares (auth, validation, errors)
│   ├── routes/             # Express routes definitions
│   ├── services/           # Core business logic
│   ├── types/              # TypeScript typings
│   ├── utils/              # Helper utilities (jwt, email)
│   ├── validations/        # Zod validation schemas
│   ├── app.ts              # Express application setup
│   └── server.ts           # Server initialization
├── tests/                  # Jest test files
├── .env.example            # Example environment variables
├── jest.config.js          # Jest configuration
├── package.json
└── tsconfig.json           # TypeScript configuration
```

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eventhub?schema=public"
PORT=5000
JWT_SECRET="supersecretjwtkey"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:3000"
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="ethereal_user"
SMTP_PASSWORD="ethereal_password"
EMAIL_FROM="noreply@eventhub.com"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## PostgreSQL Setup

1. Ensure PostgreSQL is installed and running on your local machine.
2. Create a database named `eventhub` (or update `DATABASE_URL` with your existing database details).

## Setup & Run

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Prisma Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed Database:**
   ```bash
   npm run prisma:seed
   ```
   *(Note: The seed script uses `password123` for all generated users: `admin@example.com`, `organizer@example.com`, `customer1@example.com`)*

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login to get JWT
- `GET /api/auth/me` - Get current user profile

### Events
- `GET /api/events` - Get all events (supports pagination & search)
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (ADMIN/ORGANIZER)
- `PATCH /api/events/:id` - Update event (ADMIN/ORGANIZER)
- `DELETE /api/events/:id` - Delete event (ADMIN/ORGANIZER)

### Bookings
- `POST /api/bookings` - Create a booking (initiates Stripe payment)
- `GET /api/bookings` - Get my bookings (CUSTOMER)
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings/:id/cancel` - Cancel a confirmed booking

### Admin & Organizer
- `GET /api/admin/bookings` - View all bookings (ADMIN)
- `GET /api/organizer/bookings` - View own event bookings (ORGANIZER)

### Payments (Webhook)
- `POST /api/payments/webhook` - Stripe webhook endpoint (requires raw body)

### Health Check
- `GET /api/health` - API status check

## Testing

Run tests using Jest and Supertest:
```bash
npm test
```

## Payment Flow & Stripe Setup

The booking process involves creating a `PENDING` booking and returning a Stripe Checkout URL. The frontend will redirect the user to Stripe. Once payment is completed, Stripe sends a webhook to `/api/payments/webhook`.

### Testing Webhooks Locally

1. Install the Stripe CLI.
2. Authenticate the CLI with your Stripe account.
3. Forward webhook events to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
4. Copy the webhook signing secret output by the CLI and paste it into your `.env` as `STRIPE_WEBHOOK_SECRET`.
