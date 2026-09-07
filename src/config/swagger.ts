export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'EventHub API Documentation',
    version: '1.0.0',
    description:
      'REST API documentation for EventHub – Event & Ticket Booking Platform built with Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, Nodemailer, and Stripe.',
    contact: {
      name: 'EventHub Support',
      email: 'support@eventhub.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /api/auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-466c-8511-b0e5095d3152' },
          name: { type: 'string', example: 'Rahul Sharma' },
          email: { type: 'string', format: 'email', example: 'rahul.test@yopmail.com' },
          role: { type: 'string', enum: ['ADMIN', 'ORGANIZER', 'CUSTOMER'], example: 'CUSTOMER' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '00000000-0000-4000-8000-000000000001' },
          title: { type: 'string', example: 'React & Node.js Developer Summit 2026' },
          description: {
            type: 'string',
            example: 'Join leading engineers for in-depth talks on React 19, TypeScript, and microservices.',
          },
          location: { type: 'string', example: 'Bangalore International Exhibition Centre' },
          date: { type: 'string', format: 'date-time', example: '2027-04-15T10:00:00.000Z' },
          price: { type: 'number', example: 1499 },
          totalSeats: { type: 'integer', example: 200 },
          availableSeats: { type: 'integer', example: 198 },
          imageUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
          },
          organizerId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          eventId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', example: 2 },
          totalAmount: { type: 'number', example: 2998 },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], example: 'PENDING' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          event: { $ref: '#/components/schemas/Event' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API server health',
        description: 'Returns server status and liveness.',
        responses: {
          200: {
            description: 'Server is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'EventHub API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Creates a new user account (CUSTOMER or ORGANIZER). Sends a welcome email.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Rahul Sharma' },
                  email: { type: 'string', format: 'email', example: 'rahul.test@yopmail.com' },
                  password: { type: 'string', format: 'password', minLength: 6, example: 'password123' },
                  role: { type: 'string', enum: ['CUSTOMER', 'ORGANIZER'], default: 'CUSTOMER', example: 'CUSTOMER' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Registration successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          409: {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User Login',
        description: 'Authenticates credentials and returns a signed JWT Bearer token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@example.com' },
                  password: { type: 'string', format: 'password', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: {
                          type: 'string',
                          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get Current User Profile',
        description: 'Returns profile details of the currently authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile returned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized - Missing or invalid JWT token',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List All Events (Public)',
        description: 'Fetch paginated events with optional case-insensitive search filter by title.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default 1)',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page (default 10)',
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search string to filter events by title',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        events: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Event' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer', example: 1 },
                            limit: { type: 'integer', example: 10 },
                            total: { type: 'integer', example: 25 },
                            totalPages: { type: 'integer', example: 3 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create a New Event',
        description: 'Creates a new event. Restricted to ADMIN and ORGANIZER roles.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'location', 'date', 'price', 'totalSeats'],
                properties: {
                  title: { type: 'string', minLength: 3, example: 'AI & Cloud Infrastructure Summit' },
                  description: {
                    type: 'string',
                    minLength: 10,
                    example: 'Explore modern AI agents, vector databases, and high-scale cloud setups.',
                  },
                  location: { type: 'string', example: 'Hyderabad HICC' },
                  date: { type: 'string', format: 'date-time', example: '2027-11-20T09:30:00.000Z' },
                  price: { type: 'number', minimum: 0, example: 1999 },
                  totalSeats: { type: 'integer', minimum: 1, example: 150 },
                  imageUrl: {
                    type: 'string',
                    format: 'uri',
                    example: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Event created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Event created successfully' },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - User is not ADMIN or ORGANIZER',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/events/{id}': {
      get: {
        tags: ['Events'],
        summary: 'Get Single Event by ID',
        description: 'Fetch detailed information of a specific event.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Event UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Event details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Event not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      patch: {
        tags: ['Events'],
        summary: 'Update Event',
        description: 'Update event fields. Allowed for ADMIN, or the ORGANIZER who created it.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Updated Title' },
                  description: { type: 'string' },
                  location: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  price: { type: 'number' },
                  totalSeats: { type: 'integer' },
                  imageUrl: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Event updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Event updated successfully' },
                    data: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Only ADMIN or the owner ORGANIZER can update',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          404: {
            description: 'Event not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      delete: {
        tags: ['Events'],
        summary: 'Delete Event',
        description: 'Deletes an event. Allowed for ADMIN, or the ORGANIZER who created it.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Event deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Event deleted successfully' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Insufficient permissions',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          404: {
            description: 'Event not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create Ticket Booking & Stripe Checkout',
        description:
          'Customer reserves seats for an event. Creates a PENDING booking and generates a real Stripe checkout URL.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'quantity'],
                properties: {
                  eventId: { type: 'string', format: 'uuid', example: '00000000-0000-4000-8000-000000000001' },
                  quantity: { type: 'integer', minimum: 1, example: 2 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Booking created, pending payment',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Booking created, pending payment' },
                    data: {
                      type: 'object',
                      properties: {
                        booking: { $ref: '#/components/schemas/Booking' },
                        checkoutUrl: {
                          type: 'string',
                          format: 'uri',
                          example: 'https://checkout.stripe.com/c/pay/cs_test_...',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error / Seats unavailable / Past event date',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      get: {
        tags: ['Bookings'],
        summary: 'Get My Bookings',
        description: 'Returns list of bookings made by the currently logged-in customer.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
          },
        ],
        responses: {
          200: {
            description: 'List of customer bookings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        bookings: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Booking' },
                        },
                        pagination: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get Booking by ID',
        description: 'Fetch details of a single booking (owner customer or admin).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Booking details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Booking not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/bookings/{id}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Cancel Booking',
        description: 'Customer cancels their booking. Seats are automatically released back to the event.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Booking cancelled successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Booking cancelled successfully' },
                    data: { $ref: '#/components/schemas/Booking' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Cannot cancel already cancelled booking',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/admin/bookings': {
      get: {
        tags: ['Admin'],
        summary: 'Get All System Bookings (Admin Only)',
        description: 'Admin view of all bookings across all events and users.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] } },
        ],
        responses: {
          200: {
            description: 'System-wide bookings list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        bookings: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
                        pagination: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Requires ADMIN role',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/organizer/bookings': {
      get: {
        tags: ['Organizer'],
        summary: 'Get Bookings for Organizer Events',
        description: 'Organizer view of ticket bookings only for events they created.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] } },
        ],
        responses: {
          200: {
            description: 'Bookings list for organizer events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        bookings: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
                        pagination: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Forbidden - Requires ORGANIZER role',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
  },
};
