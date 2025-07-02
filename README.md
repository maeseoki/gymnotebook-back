# Gym Notebook API - Fastify Migration

This is the refactored backend for the Gym Notebook application, migrated from Java Spring Boot to Node.js with Fastify, TypeScript, and modern tooling.

## Tech Stack

- **Runtime**: Bun (JavaScript runtime)
- **Framework**: Fastify (web framework)
- **Language**: TypeScript
- **Database**: PostgreSQL with DrizzleORM
- **Authentication**: JWT
- **Linting**: Biome
- **Architecture**: Screaming Architecture (feature-based organization)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /signin` - User login
- `POST /signup` - User registration  
- `GET /logout` - User logout

### User Management (`/api/user`)
- `GET /` - Get all users (admin/moderator only)
- `GET /verifyuser/:username/:email` - Check username/email availability
- `GET /me` - Get current user info
- `PUT /setpermissions` - Set user permissions (admin only)
- `PUT /removepermissions` - Remove user permissions (admin only)
- `DELETE /:id` - Delete user (admin only)

### Exercise Management (`/api/exercise`)
- `GET /` - Get user's exercises (with filtering and pagination)
- `GET /:id` - Get specific exercise
- `POST /` - Create new exercise
- `PUT /:id` - Update exercise
- `DELETE /:id` - Delete exercise

### Workout Management (`/api/workout`)
- `GET /` - Get user's workouts (with filtering and pagination)
- `GET /:id` - Get specific workout
- `GET /days/:month/:year` - Get workout days for calendar
- `GET /workouts/:date` - Get workouts for specific date
- `POST /` - Create new workout with sets
- `DELETE /:id` - Delete workout

### Test Endpoints (`/api/test`)
- `GET /all` - Public access test
- `GET /user` - Authenticated user test
- `GET /mod` - Moderator access test
- `GET /admin` - Admin access test
- `GET /me` - Current user test

## Project Structure

```
src/
├── config/           # Configuration files
├── database/         # Database schemas and migrations
├── features/         # Feature modules (screaming architecture)
│   ├── auth/         # Authentication
│   ├── users/        # User management
│   ├── exercises/    # Exercise management
│   └── workouts/     # Workout management
└── shared/           # Shared utilities and types
    ├── middleware/   # Authentication, error handling
    ├── types/        # Common TypeScript types
    └── utils/        # Utility functions
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=8080
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=gymnotebook
JWT_SECRET=your_secret_key_here
```

## Development Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Lint code
bun run lint

# Format code
bun run format

# Generate database migrations
bun run db:generate

# Run database migrations
bun run db:migrate

# Open database studio
bun run db:studio
```

## Database Setup

1. Create PostgreSQL database
2. Configure environment variables
3. Generate and run migrations:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```
4. Seed initial roles:
   ```sql
   INSERT INTO roles (name) VALUES 
     ('ROLE_USER'),
     ('ROLE_MODERATOR'),
     ('ROLE_ADMIN');
   ```

## API Documentation

When running in development, Swagger documentation is available at:
`http://localhost:8080/docs`

## Authentication

All endpoints except `/api/auth/*` and `/api/test/all` require JWT authentication.
Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access Control

- **USER**: Can manage own exercises and workouts
- **MODERATOR**: Can view all users
- **ADMIN**: Full access including user management

## Migration from Java Spring Boot

This application maintains API compatibility with the original Java Spring Boot version while providing:

- ✅ Better performance with Bun runtime
- ✅ Modern TypeScript development experience
- ✅ Improved architecture with feature-based organization
- ✅ Better tooling with Biome for linting/formatting
- ✅ More maintainable code structure
- ✅ All original functionality preserved
