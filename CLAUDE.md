# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YesLocker (台球杆柜管理小程序) is a comprehensive billiard cue locker digital management system supporting:
- User-side applications for locker rentals and operations
- Admin panel for approval workflows and management  
- Complete business flow from application to storage operations

The project features a **hybrid architecture** supporting both legacy monolithic server files and a modern modular service-controller pattern with TypeScript.

## Tech Stack

### Frontend Stack
- **User App (src/)**: Vue 3 + Vite + TypeScript + Pinia
- **Admin Panel (admin/)**: Vue 3 + Vite + TypeScript + Pinia  
- **UI Components**: Custom components with Vue 3 Composition API
- **State Management**: Pinia stores for both applications
- **Build Tool**: Vite with TypeScript support

### Backend Stack (Dual Architecture)
- **Modern API (server/src/)**: TypeScript + Express.js with service-controller pattern
- **Legacy API (server/)**: JavaScript Express.js monolithic files
- **Database**: SQLite (development) / PostgreSQL (production) with Knex.js + Objection.js
- **Authentication**: JWT with bcrypt password hashing
- **Deployment**: Railway platform with PostgreSQL

## Essential Commands

### Development Setup
```bash
# Install dependencies for all parts
npm install                    # Root client dependencies
cd admin && npm install        # Admin panel dependencies  
cd server && npm install       # Backend server dependencies

# Database initialization
cd server && npm run db:init   # Initialize SQLite database
```

### Development Servers

#### Modern Modular Server (TypeScript)
```bash
cd server
npm run dev                    # Start TypeScript server with hot reload (port 3001)
npm run build                  # Build TypeScript to JavaScript
npm run start                  # Run built JavaScript version
npm run type-check             # Type checking without compilation
```

#### Legacy Server (JavaScript)
```bash
cd server
npm run dev:legacy             # Start legacy server (index.js)
npm run dev:railway            # Start Railway production server (index-railway.js)
```

#### Frontend Development
```bash
# Start user app dev server (port 3000)
npm run dev

# Start admin panel dev server (port 5173)
npm run dev:admin

# Start all services together (legacy server)
npm run dev:all
```

### Database Operations  
```bash
cd server
npm run db:init                # Initialize database
npm run db:reset               # Reset database to clean state
npm run db:check               # Check database status
npm run db:optimize            # Apply performance indexes
npm run db:enhance             # Apply enhanced constraints
```

### Build Commands
```bash
# Build complete project (client + admin + server)
npm run build

# Build individual components
npm run build:client           # Build user application
npm run build:admin            # Build admin panel
npm run build:server           # Prepare server (install dependencies)
```

### Code Quality
```bash
# TypeScript type checking
npm run type-check             # Root project
cd server && npm run type-check # Server TypeScript

# Linting with auto-fix
npm run lint                   # Root project linting
```

## Architecture Overview

### Hybrid Backend Architecture

The project supports **two parallel backend architectures**:

#### 1. Legacy Monolithic Architecture (`server/`)
- **Main Files**: `index-railway.js` (production), `index.js` (development)
- **Structure**: Single 2000+ line files containing all business logic
- **Database**: Direct SQL queries with custom database abstraction
- **Status**: Production-ready, currently deployed

#### 2. Modern Modular Architecture (`server/src/`)
- **Structure**: Service-Controller pattern with TypeScript
- **Layers**: Models → Repositories → Services → Controllers → Routes
- **Database**: Knex.js + Objection.js ORM with connection pooling
- **Status**: Fully implemented, ready for integration

```
server/src/
├── models/              # Objection.js models with relationships
├── repositories/        # Data access layer with complex queries
├── services/           # Business logic layer (AuthService, UserService, etc.)
├── controllers/        # HTTP request handling layer
├── routes/             # Feature-organized route modules
├── middleware/         # Authentication, validation, logging
└── server.ts          # Modern server entry point
```

### Database Architecture

- **Development**: SQLite with file-based storage (`server/database/yeslocker.db`)
- **Production**: PostgreSQL on Railway with connection pooling
- **Dual Support**: Both architectures work with same database schemas
- **Migration System**: Separate initialization scripts for each database type

#### Critical Database Schema Notes
- **applications.assigned_locker_id**: References lockers.id (NOT applications.locker_id)
- **Foreign Key Constraints**: All relationships must exist for queries to work properly
- **Performance Indexes**: Applied via `npm run db:optimize`
- **Enhanced Constraints**: Applied via `npm run db:enhance`

### Key Design Patterns

#### Modern Architecture Patterns
- **Repository Pattern**: Data access abstraction (`BaseRepository`)
- **Service Layer Pattern**: Business logic encapsulation (`BaseService`)
- **Controller Pattern**: HTTP handling with validation (`BaseController`)
- **Dependency Injection**: Services injected into controllers
- **Error Handling**: Consistent service responses with proper HTTP status codes

#### Legacy Architecture Patterns
- **Monolithic Pattern**: All logic in single files
- **Direct Database Access**: Custom SQL query builders
- **Middleware Stack**: Express.js middleware for auth and validation

### Environment Configuration

Development requires multiple environment files:
- **Root `.env.local`**: User app configuration
- **`server/.env`**: Backend API and database settings  
- **`admin/.env`**: Admin panel specific settings

Key environment variables:
- `DATABASE_URL` - Database connection (SQLite file or PostgreSQL URL)
- `JWT_SECRET` - Token signing secret
- `PORT` - Server port (default 3001)
- `NODE_ENV` - Environment mode

## Critical System Information

### Production Server Details
- **Live URL**: https://yeslocker-web-production-314a.up.railway.app
- **Current Server**: `server/index-railway.js` (legacy monolithic)
- **Modern Server**: `server/src/server.ts` (ready for deployment)
- **Admin Credentials**: phone: '13800000002', password: 'admin123' (testing)
- **Database**: PostgreSQL hosted on Railway

### Architecture Migration Status

#### ✅ Completed (Modern Architecture)
- Database abstraction layer (Models + Repositories)
- Service layer (AuthService, UserService, StoreService, ApplicationService, LockerService)
- Controller layer with validation and error handling
- Modular route organization by feature domain
- Authentication middleware with role-based access control
- TypeScript configuration and build system

#### 🔄 Migration-Ready Components
- **Authentication**: `/api/auth/*` endpoints ready
- **User Management**: `/api/users/*` endpoints ready
- **Store Management**: `/api/stores/*` endpoints ready  
- **Applications**: `/api/applications/*` endpoints ready
- **Legacy Compatibility**: Redirect mapping for old endpoints

#### 📋 Pending Integration
- Complete transition from legacy to modular endpoints
- Frontend service layer updates to new API structure
- Comprehensive testing of modular architecture
- Production deployment of modern server

### Common Issues and Solutions

#### Database Foreign Key Problems
- **Issue**: Applications may show undefined foreign key relationships
- **Root Cause**: SQL queries using incorrect field names in JOIN operations
- **Critical Fix**: Always use `assigned_locker_id` not `locker_id` in applications table queries
- **Example**: `LEFT JOIN lockers l ON a.assigned_locker_id = l.id`

#### Architecture Switching
- **Legacy Server**: Use `npm run dev:legacy` or `npm run start:railway`
- **Modern Server**: Use `npm run dev` or `npm run start` in server directory
- **API Endpoints**: Modern server includes legacy compatibility redirects

### Development Workflow

#### Working with Modern Architecture
```bash
cd server

# Development with hot reload
npm run dev

# Type checking during development  
npm run type-check

# Build for production
npm run build && npm run start
```

#### Working with Legacy Architecture
```bash
cd server

# Development with legacy server
npm run dev:legacy

# Production-style testing
npm run dev:railway
```

#### Database Development
```bash
cd server

# Check current state
npm run db:check

# Reset and reinitialize
npm run db:reset
npm run db:init

# Apply performance optimizations
npm run db:optimize
npm run db:enhance
```

## Code Conventions

### Modern Backend (TypeScript)
- **File Organization**: Feature-based modules (`AuthService.ts`, `UserController.ts`)
- **Class Names**: PascalCase with descriptive suffixes (`BaseService`, `ApplicationRepository`)
- **Method Names**: camelCase with action verbs (`createUser`, `authenticateAdmin`)
- **Error Handling**: Service response pattern with `ServiceResponse<T>` interface
- **Database**: Objection.js models with TypeScript interfaces

### Legacy Backend (JavaScript)
- **File Structure**: Monolithic with inline functions
- **Database**: Direct SQL with custom query builders
- **Error Handling**: Express.js standard error middleware
- **Routes**: Inline route definitions with middleware

### Frontend Conventions (Vue 3 + TypeScript)
- **Components**: PascalCase Vue components (`LoginForm.vue`, `UserDashboard.vue`)
- **Composables**: `use` prefix for composables (`useAuth.ts`, `useLockers.ts`)
- **Services**: kebab-case API service files (`api-service.ts`, `auth-service.ts`)
- **Stores**: Descriptive Pinia store names (`useAuthStore`, `useLockerStore`)

### Database Conventions
- **Tables**: Lowercase with underscores (`users`, `locker_records`, `applications`)
- **Columns**: snake_case naming (`created_at`, `user_id`, `locker_number`)
- **Relationships**: Clear foreign key naming (`user_id`, `store_id`, `admin_id`)

## Project Structure

```
yeslocker/
├── src/                    # User frontend application
│   ├── components/        # Reusable Vue components
│   ├── pages/            # Page-level Vue components  
│   ├── stores/           # Pinia state management
│   ├── services/         # API integration services
│   └── router/           # Vue Router configuration
│
├── admin/                 # Admin management panel
│   ├── src/              # Admin-specific components and pages
│   ├── dist/             # Built admin panel
│   └── package.json      # Admin dependencies and scripts
│
├── server/                # Backend API (dual architecture)
│   ├── src/              # MODERN: Modular TypeScript architecture
│   │   ├── models/       # Objection.js models
│   │   ├── repositories/ # Data access layer
│   │   ├── services/     # Business logic layer
│   │   ├── controllers/  # HTTP handling layer
│   │   ├── routes/       # Feature-organized routes
│   │   ├── middleware/   # Auth, validation, logging
│   │   └── server.ts     # Modern server entry point
│   │
│   ├── database/         # Database initialization and migrations
│   ├── index-railway.js  # LEGACY: Production monolithic server
│   ├── index.js          # LEGACY: Development monolithic server
│   └── package.json      # Backend dependencies (updated for TypeScript)
│
├── public/               # Static assets served directly
├── dist/                # Built user application
├── docs/                # Project documentation
└── tests/               # Testing suites (e2e, integration, unit)
```

## Port Configuration
- **User App**: 3000 (Vite dev server)
- **Admin Panel**: 5173 (Vite dev server)  
- **Backend API**: 3001 (Express.js server - both architectures)
- **Database**: SQLite file-based or PostgreSQL

## Deployment Strategy

### Railway Production Deployment
- **Current**: Legacy monolithic server (`index-railway.js`)
- **Future**: Modern modular server (`src/server.ts`)
- **Database**: PostgreSQL with automatic backups
- **Static Files**: Express.js serves built frontend assets

### Environment Variables for Production
```bash
# Database
DATABASE_URL=postgresql://...     # Auto-provided by Railway

# Authentication  
JWT_SECRET=your-production-secret

# Server Configuration
NODE_ENV=production
PORT=3001                        # Railway will override
```

## Core Business Features

### User Application Flow
1. **Registration**: Phone number verification
2. **Locker Application**: Submit application with store/locker selection  
3. **Admin Approval**: Admin review and approval/rejection workflow
4. **Locker Operations**: Check-in/check-out billiard cues
5. **Record Keeping**: Track usage history and payments

### Admin Management Features  
1. **Dashboard**: Overview statistics and recent activities
2. **User Management**: View and manage user accounts
3. **Locker Management**: Configure and monitor locker availability
4. **Application Review**: Approve/reject user applications with workflow
5. **Operations Monitoring**: Track usage patterns and system health

## API Architecture

### Modern API Endpoints (TypeScript)
```
/api/auth/*          # Authentication (login, logout, token management)
/api/users/*         # User management (CRUD, statistics, profiles)  
/api/stores/*        # Store management (locations, capacity analysis)
/api/applications/*  # Application workflow (submit, approve, reject)
/api/lockers/*       # Locker management (availability, operations)
/api/records/*       # Usage records (check-in/out, history)
```

### Legacy API Endpoints (JavaScript)
```
/admin-login         # Admin authentication
/lockers-apply       # User application submission
/admin-approval      # Application management
/check-user          # User verification
/stores              # Store listing
```

### API Response Format (Modern)
```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  statusCode?: number;
  timestamp: string;
}
```

## Testing Strategy

### Available Test Suites
```bash
# End-to-end testing
cd tests/e2e && node test-complete-business-flow.js

# Load testing
cd tests/load-testing && node stress-test-suite.js

# Edge case testing
cd tests/edge-cases && node comprehensive-edge-case-runner.js

# Legacy debugging
cd tests/debug && node test-admin-approval-500.js
```

### Testing Database Issues
```bash
# Verify database relationships
cd tests/debug && node test-database-data.js

# Test foreign key constraints
cd tests/debug && node test-database-structure.js

# Test authentication flow
cd tests/debug && node test-jwt-auth.js
```

## Development Tips

### Architecture Decision Making
- **New Features**: Use modern TypeScript architecture in `server/src/`
- **Bug Fixes**: Fix in legacy files, then port to modern architecture
- **API Changes**: Implement in modern architecture with legacy compatibility
- **Database Changes**: Update both legacy and modern query patterns

### Debugging Common Issues
- **500 Errors**: Usually foreign key relationship problems
- **401 Errors**: JWT token expiration or invalid credentials
- **409 Errors**: Business logic conflicts (duplicate applications)
- **Database Lock**: Restart SQLite connection or check for unclosed transactions

### Performance Monitoring
- **Response Times**: ~1000ms normal, >2000ms indicates issues
- **Database Queries**: Monitor for N+1 problems and missing indexes
- **Memory Usage**: Check for connection pool leaks in PostgreSQL