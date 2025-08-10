# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YesLocker (台球杆柜管理小程序) is a comprehensive billiard cue locker digital management system supporting:
- User-side applications for locker rentals and operations
- Admin panel for approval workflows and management
- Complete business flow from application to storage operations

The project uses a three-layer architecture with Vue 3 frontend applications, Express.js backend API, and PostgreSQL/SQLite database.

## Tech Stack

### Frontend Stack
- **User App (src/)**: Vue 3 + Vite + TypeScript + Pinia
- **Admin Panel (admin/)**: Vue 3 + Vite + TypeScript + Pinia  
- **UI Components**: Custom components with Vue 3 Composition API
- **State Management**: Pinia stores for both applications
- **Build Tool**: Vite with TypeScript support

### Backend Stack  
- **API Server (server/)**: Express.js with middleware architecture
- **Authentication**: JWT with bcrypt password hashing
- **Database**: SQLite (development) / PostgreSQL (production)
- **Development**: Local-first with hot reload via nodemon
- **Deployment**: Railway platform with PostgreSQL

## Essential Commands

### Development Setup
```bash
# Install dependencies for all parts
npm install                    # Root client dependencies
cd admin && npm install        # Admin panel dependencies  
cd ../server && npm install    # Backend server dependencies

# Database initialization
npm run db:init               # Initialize SQLite database
```

### Development Servers
```bash
# Start user app dev server (port 3000)
npm run dev

# Start admin panel dev server (port 5173)
npm run dev:admin

# Start backend API server (port 3001) 
npm run dev:server

# Start all services together
npm run dev:all
```

### Database Operations  
```bash
# SQLite operations (development)
cd server
npm run db:init              # Initialize database
npm run db:reset             # Reset database to clean state
npm run db:check             # Check database status

# PostgreSQL operations (production)
npm run db:init:pg           # Initialize PostgreSQL database
```

### Build Commands
```bash
# Build user application
npm run build:client

# Build admin panel  
cd admin && npm run build

# Build complete project
npm run build
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting with auto-fix
npm run lint
```

## Architecture Overview

### Three-Layer Application Architecture

1. **User Frontend Layer** (`src/`)
   - Vue 3 + Vite + TypeScript application for end users
   - Features: User registration, locker applications, operation records
   - Pinia for state management, Vue Router for navigation
   - API integration through service layers

2. **Admin Frontend Layer** (`admin/`) 
   - Vue 3 + Vite + TypeScript admin management panel
   - Features: Dashboard, user management, locker oversight, application approvals
   - Separate build process and routing from user app
   - Shared component patterns with user app

3. **Backend API Layer** (`server/`)
   - Express.js REST API server with modular route structure
   - Authentication: JWT-based with bcrypt password hashing
   - Database abstraction supporting SQLite (dev) and PostgreSQL (prod)
   - Middleware: CORS, auth verification, error handling, request logging

### Database Architecture

- **Development**: SQLite with file-based storage for rapid iteration
- **Production**: PostgreSQL on Railway with connection pooling
- **Core Tables**: users, stores, lockers, locker_records, applications, admins
- **Migration System**: Separate initialization scripts for each database type

### Key Design Patterns

- **Service Layer Pattern**: API communication abstracted through service files
- **Store Pattern**: Pinia stores for state management with caching strategies  
- **Modular Routes**: Express routes organized by feature domain
- **Database Abstraction**: Same codebase works with SQLite/PostgreSQL
- **Environment-Based Configuration**: Different configs for dev/production

### Environment Configuration

Development requires multiple environment files:
- Root `.env.local` - User app configuration
- `server/.env` - Backend API and database settings
- `admin/.env` - Admin panel specific settings

Key environment variables:
- `DATABASE_URL` - Database connection (SQLite file or PostgreSQL URL)
- `JWT_SECRET` - Token signing secret
- `PORT` - Server port (default 3001)
- `NODE_ENV` - Environment mode

## Deployment Strategy

### Railway Platform Deployment

The project is configured for deployment on Railway with PostgreSQL database.

#### Production Configuration
- **Frontend Serving**: Express.js serves built static assets
- **Backend API**: Node.js Express server
- **Database**: Railway PostgreSQL with automatic backups
- **Build Process**: Multi-stage build combining user app, admin panel, and server

#### Railway Configuration (`railway.json`)
```json
{
  "build": {
    "command": "npm run build && cd admin && npm run build && cd ../server && npm install"
  },
  "start": {
    "command": "cd server && npm run start:railway"
  },
  "environment": {
    "NODE_ENV": "production"
  }
}
```

#### Environment Variables for Production
```bash
# Database
DATABASE_URL=postgresql://...     # Auto-provided by Railway
DATABASE_PUBLIC_URL=postgresql://...  # Alternative connection string

# Authentication  
JWT_SECRET=your-production-secret

# Server Configuration
NODE_ENV=production
PORT=3001                        # Railway will override

# Application URLs
FRONTEND_URL=https://your-app.railway.app
```

### Database Migration Strategy

The project supports both SQLite (development) and PostgreSQL (production):

- **Development**: File-based SQLite for rapid local development
- **Production**: PostgreSQL with connection pooling and Railway management
- **Migration Scripts**: Separate initialization for each database type
- **Schema Compatibility**: Abstracted queries work with both database systems

## Development Workflow

### Local Development Setup

1. **Initial Setup**:
   ```bash
   # Install all dependencies
   npm install
   cd admin && npm install
   cd ../server && npm install
   
   # Initialize database
   cd server && npm run db:init
   ```

2. **Daily Development**:
   ```bash
   # Start all services (recommended)
   npm run dev:all
   
   # OR start individually:
   npm run dev           # User app (port 3000)
   npm run dev:admin     # Admin panel (port 5173)  
   npm run dev:server    # API server (port 3001)
   ```

3. **Database Operations**:
   ```bash
   cd server
   npm run db:check      # Check current state
   npm run db:reset      # Reset to clean state
   npm run db:init       # Reinitialize
   ```

### Development Features

- **Hot Reload**: All three applications support live reloading
- **TypeScript**: Full TypeScript support with type checking
- **API Testing**: Backend server logs all requests for debugging
- **Database Flexibility**: Switch between SQLite/PostgreSQL easily
- **Error Handling**: Comprehensive error logging and user feedback

### Code Organization Principles

- **Modular Structure**: Each layer (user app, admin, server) is self-contained
- **Shared Patterns**: Common patterns between frontend applications
- **API Consistency**: RESTful endpoints with consistent response formats
- **Database Abstraction**: Same codebase works with multiple database types

## Code Conventions

- **Component Files**: Use PascalCase for component files (e.g., `LoginForm.vue`)
- **Service Files**: Use kebab-case for service files (e.g., `api-service.ts`)
- **Type Definitions**: Keep types in `shared/types/` for cross-app usage
- **API Calls**: Use service layer pattern in both frontend apps
- **State Management**: Use Pinia stores with clear naming (e.g., `useAuthStore`, `useLockerStore`)
- **Vue Composition API**: Use `<script setup>` syntax consistently
- **Error Handling**: Implement try-catch with user-friendly error messages
- **API Endpoints**: RESTful naming - `/api/resource` pattern

## Project Structure (Simplified)

```
yeslocker/
├── src/                    # Client web app (users)
│   ├── views/             # Page components
│   ├── components/        # Reusable components
│   ├── stores/           # Pinia stores
│   ├── services/         # API communication
│   ├── router/           # Vue Router config
│   └── assets/           # Static assets
├── admin/                 # Admin web panel
│   ├── views/            # Admin page components
│   ├── components/       # Admin-specific components
│   ├── stores/           # Admin state management
│   └── services/         # Admin API services
├── server/                # Express.js backend
│   ├── routes/           # API route handlers
│   ├── middleware/       # Custom middleware
│   ├── database/         # Database schema and operations
│   ├── models/           # Data models
│   └── utils/            # Helper functions
├── shared/                # Shared code between apps
│   ├── types/            # TypeScript definitions
│   ├── constants/        # Shared constants
│   └── utils/            # Shared utilities
└── docs/                  # Documentation
```

## Important Development Notes

### Port Configuration (Local Development)
- **Client app**: 3000 (Vite dev server)
- **Admin panel**: 5173 (Vite dev server)
- **Backend API**: 3001 (Express.js server)
- **Database**: SQLite file-based (no separate port)

### Local Development Setup
```bash
# First time setup
npm install                 # Install client dependencies
cd admin && npm install     # Install admin dependencies  
cd ../server && npm install # Install server dependencies
npm run db:init            # Initialize SQLite database

# Daily development
npm run dev                # Start all services
# OR start individually:
npm run dev:client         # Just client app
npm run dev:admin          # Just admin panel  
npm run dev:server         # Just backend API
```

### Debugging and Logs
```bash
# Check server logs
npm run dev:server         # Shows API logs in terminal

# Database inspection  
npm run db:inspect         # View current database state
npm run db:reset           # Reset database to clean state
npm run db:seed            # Add sample data

# Build verification
npm run build:all          # Test production builds locally
```

### Key Files to Check When Troubleshooting
- **Environment variables**: `.env.local` (simple local config)
- **Database schema**: `server/database/schema.sql`
- **API routes**: `server/routes/` directory  
- **Client configuration**: `src/main.ts` and `vite.config.ts`
- **Admin configuration**: `admin/main.ts` and `admin/vite.config.ts`

## Testing Accounts (Development)

- Admin: `admin@test.com` / `admin123`
- Store Admin: `store@test.com` / `admin123`  
- Regular User: `user@test.com` / `user123`
- Phone verification: Use any format, no SMS required locally

## Development Focus Areas

### Current Priority: Core Features
1. **User Authentication**: Login/register with email + password
2. **Locker Management**: Apply, approve, view status
3. **Admin Dashboard**: User management, locker oversight
4. **Data Flow**: Ensure all CRUD operations work between frontend and backend

### What to Ignore for Now
- SMS integration (use mock for local development)
- Complex deployment configurations  
- Multi-environment setups
- Advanced security features (implement basic JWT first)
- File uploads (focus on core business logic)

### Success Criteria for Phase 1
- Users can register, login, and apply for lockers
- Admins can login and approve/reject applications
- Both apps communicate successfully with local API
- Database operations work reliably
- Hot reload works for rapid development iteration