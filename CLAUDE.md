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

### Frontend Conventions (Vue 3 + TypeScript)
- **Component Files**: PascalCase for Vue components (`LoginForm.vue`, `UserDashboard.vue`)
- **Composables**: Use prefix `use` for composables (`useAuth.ts`, `useLockers.ts`)
- **Services**: kebab-case for API service files (`api-service.ts`, `auth-service.ts`)
- **Pinia Stores**: Clear descriptive names (`useAuthStore`, `useLockerStore`, `useAdminStore`)
- **Vue Composition API**: Prefer `<script setup>` syntax with TypeScript
- **Props/Emits**: Define with TypeScript interfaces for type safety

### Backend Conventions (Express.js + Node.js)
- **Route Files**: Feature-based organization (`auth.js`, `lockers.js`, `admin.js`)
- **Middleware**: Descriptive names (`authenticateToken`, `validateAdmin`, `logRequests`)
- **Database**: Use abstracted database layer for SQLite/PostgreSQL compatibility
- **Error Handling**: Consistent error response format across all endpoints
- **API Endpoints**: RESTful naming with `/api/` prefix

### Database Conventions
- **Table Names**: Lowercase with underscores (`users`, `locker_records`, `applications`)
- **Column Names**: snake_case naming (`created_at`, `user_id`, `locker_number`)
- **Relationships**: Clear foreign key naming (`user_id`, `store_id`, `admin_id`)

## Project Structure

```
yeslocker/
├── src/                    # User frontend application
│   ├── components/        # Reusable Vue components
│   ├── views/            # Page-level Vue components  
│   ├── stores/           # Pinia state management
│   ├── services/         # API integration services
│   ├── router/           # Vue Router configuration
│   ├── utils/            # Frontend utility functions
│   └── assets/           # Static assets (images, styles)
│
├── admin/                 # Admin management panel
│   ├── components/       # Admin-specific components
│   ├── views/           # Admin page components
│   ├── stores/          # Admin state management  
│   ├── services/        # Admin API services
│   └── styles/          # Admin-specific styles
│
├── server/                # Express.js backend API
│   ├── routes/          # API route handlers by feature
│   ├── middleware/      # Custom Express middleware
│   ├── database/        # Database initialization and queries
│   ├── utils/           # Backend utility functions
│   └── config/          # Server configuration files
│
├── public/               # Static assets served directly
├── dist/                # Built application files
└── docs/                # Project documentation
```

## Development Configuration

### Port Configuration
- **User App**: 3000 (Vite dev server)
- **Admin Panel**: 5173 (Vite dev server)  
- **Backend API**: 3001 (Express.js server)
- **Database**: SQLite file-based or PostgreSQL

### Key Configuration Files
- **Root package.json**: Main build scripts and user app dependencies
- **admin/package.json**: Admin panel specific dependencies and scripts
- **server/package.json**: Backend dependencies and database scripts
- **vite.config.ts**: Frontend build configuration
- **tsconfig.json**: TypeScript compiler configuration

### Environment Files
- **Root .env.local**: User app environment variables
- **server/.env**: Backend API configuration
- **Railway deployment**: Uses environment variables for production

## Core Business Features

### User Application Flow
1. **Registration**: Phone number + SMS verification 
2. **Locker Application**: Submit application with store selection
3. **Approval Process**: Admin review and approval/rejection
4. **Locker Operations**: Check-in/check-out billiard cues
5. **Record Keeping**: Track usage history and payments

### Admin Management Features  
1. **Dashboard**: Overview statistics and recent activities
2. **User Management**: View and manage user accounts
3. **Locker Management**: Configure and monitor locker availability
4. **Application Review**: Approve/reject user applications
5. **Operations Monitoring**: Track usage patterns and revenue

### Technical Implementation
- **Authentication**: JWT-based with phone verification
- **Database Design**: Normalized schema with proper relationships
- **API Architecture**: RESTful endpoints with consistent error handling
- **Frontend State**: Pinia stores for reactive state management
- **Development Database**: SQLite for rapid local development
- **Production Database**: PostgreSQL with Railway hosting

## Critical System Information

### Production Server Details
- **Live URL**: https://yeslocker-web-production-314a.up.railway.app
- **Primary Server File**: `server/index-railway.js` (production main server)
- **Admin Credentials**: phone: '13800000002', password: 'admin123' (for testing)
- **Database**: PostgreSQL hosted on Railway with connection pooling

### Common Issues and Solutions

#### Database Foreign Key Problems
- **Issue**: Applications may show undefined foreign key relationships (user_id, store_id, assigned_locker_id as undefined in admin panel)
- **Root Cause**: SQL queries using incorrect field names in JOIN operations
- **Critical Fix**: Always use `assigned_locker_id` not `locker_id` in applications table queries
- **Example Fix**: `LEFT JOIN lockers l ON a.assigned_locker_id = l.id` (NOT `a.locker_id = l.id`)

#### API Performance Issues
- **Normal Response Time**: ~1000ms for complex queries
- **Problem Response Time**: >2000ms indicates database performance issues
- **Monitoring**: Check server logs for slow queries and connection pool status

#### User Application Submission Flow
- **Endpoint**: `POST /lockers-apply`
- **Required Fields**: store_id, locker_id (assigned_locker_id), user_id, reason
- **Common 500 Errors**: Usually indicate missing foreign key references in database
- **Common 409 Errors**: User already has pending application (expected behavior)

### Database Schema Critical Notes
- **applications.assigned_locker_id**: References lockers.id (NOT applications.locker_id)  
- **Foreign Key Constraints**: All relationships must exist for queries to work properly
- **Seed Data**: Use `/api/init-db` endpoint to populate initial data if database is empty

### Debugging Tools and Endpoints
```bash
# Test application submission
node test-user-application.js          # Test user application flow
node test-admin-approval-500.js        # Test admin approval endpoint
node test-database-data.js             # Verify database foreign key relationships

# Production endpoints for debugging
POST /api/init-db                      # Initialize database with seed data
GET /api/admin-approval                # Admin panel applications (requires JWT)
POST /lockers-apply                    # User application submission
```

### Environment-Specific Behavior
- **Development (SQLite)**: File-based database with manual initialization
- **Production (Railway + PostgreSQL)**: Cloud database with connection pooling
- **Database Abstraction**: Same codebase supports both environments seamlessly
- **Railway Auto-Deploy**: Pushes to main branch trigger automatic deployment