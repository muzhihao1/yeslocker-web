# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YesLocker is a billiard cue locker management system focused on **local development first**. The system consists of:
- Client-side web app (src/) for user operations like locker applications
- Admin web panel (admin/) for management and approval workflows
- Local backend API server for business logic and data management

**Development Philosophy**: Build and perfect all features locally before considering deployment. Priority is on functionality and user experience rather than deployment complexity.

## Tech Stack

- **Frontend**: Vue 3 + Vite + TypeScript + Pinia
- **Client App**: Standard Vue 3 web application (migrating away from uni-app)
- **Admin Panel**: Vue 3 + Vite + TypeScript + Pinia
- **Backend**: Express.js + JWT authentication
  - Development: SQLite database
  - Production: PostgreSQL database (Railway)
- **Development**: Local-first approach with hot reload and rapid iteration

## Essential Commands

### Development (Local Focus)
```bash
# Start client app dev server (port 3000)
npm run dev:client

# Start admin panel dev server (port 5173) 
npm run dev:admin

# Start local backend API server (port 3001)
npm run dev:server

# Start all services at once (client + admin + server)
npm run dev

# Database operations (local SQLite)
npm run db:init      # Initialize database
npm run db:seed      # Populate with sample data
npm run db:reset     # Reset database
```

### Build (Local Testing)
```bash
# Build client app
npm run build:client

# Build admin panel
npm run build:admin

# Build and test locally before deployment considerations
npm run build:all
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting (ESLint with auto-fix)
npm run lint

# Run tests (when implemented)
npm run test
```

## Architecture Overview

### Simplified Three-Layer Architecture

1. **Frontend Layer** (Vue 3 + Vite + TypeScript)
   - `src/` - Client web app for users (auth, locker operations, records)
   - `admin/` - Admin web panel for management (dashboard, approvals, user/locker management)
   - Both use Pinia for state management and share component libraries
   - Standard Vue Router for navigation

2. **API Layer** (Express.js Backend)
   - Located in `server/` directory
   - REST API endpoints: `/api/auth/*`, `/api/lockers/*`, `/api/admin/*`
   - JWT-based authentication with local session management
   - Business logic and data validation
   - Simple middleware for CORS, auth, and error handling

3. **Data Layer** (SQLite + JSON)
   - SQLite database for core data (users, lockers, records, applications)
   - JSON files for configuration and seed data
   - Simple schema with relationships
   - No complex migrations - focus on functionality

### Key Design Patterns

- **API Service Pattern**: Both frontend apps use service layers for API communication
- **Store Pattern**: Pinia stores for state management and caching
- **Component Organization**: Shared component library between client and admin apps
- **Local-First Authentication**: Simple JWT with localStorage, phone verification optional
- **Path Aliases**: Use `@/` for imports in both frontend apps

### Environment Configuration

- Single `.env.local` file for all local configuration
- Simple configuration - no cloud services required initially
- Required environment variables:
  - `API_URL` (default: http://localhost:3001)
  - `JWT_SECRET` (for token signing)
  - `DB_PATH` (SQLite database file path)

## Deployment Strategy

### Platform Selection: Railway + PostgreSQL

**Rationale**: Railway provides the optimal balance of simplicity, cost, and scalability for YesLocker.

#### Why Railway?
- ✅ **Full-stack support**: Deploy both frontend and backend in one platform
- ✅ **Database included**: Built-in PostgreSQL with automatic backups
- ✅ **Zero-config CI/CD**: Git push triggers automatic deployment
- ✅ **Cost-effective**: Starting at $10/month, scales with usage
- ✅ **Developer-friendly**: Simple configuration, excellent documentation

#### Deployment Architecture
```
Production Stack:
- Frontend: Vue 3 apps (client + admin)
- Backend: Express.js API server
- Database: Railway PostgreSQL
- Hosting: Railway (container-based deployment)
```

### Migration Path: SQLite → PostgreSQL

**Database Migration Process**:
1. **Schema conversion**: Adapt SQLite schema to PostgreSQL
2. **Connection updates**: Replace sqlite3 with pg client
3. **Query adjustments**: Handle PostgreSQL-specific syntax
4. **Data migration**: Export/import data from development to production

**Code changes required**:
```javascript
// Development (SQLite)
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database(dbPath)

// Production (PostgreSQL)  
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})
```

### Deployment Phases

#### Phase 1: MVP Deployment ($10/month)
**Target**: 100-1000 users
- Railway Application: $5/month
- Railway PostgreSQL: $5/month
- Features: Core functionality, single region

**Timeline**: 1 week after local testing completion
- Day 1: Create PostgreSQL migration scripts
- Day 2: Set up Railway project and database
- Day 3-4: Deploy staging environment and test
- Day 5: Production deployment and monitoring setup

#### Phase 2: Scale & Optimize ($25/month)
**Target**: 1000-10000 users
- Upgraded Railway plan: $15/month
- Database scaling: $10/month
- CDN/Storage: $5/month
- Features: Custom domain, performance optimization

#### Phase 3: Enterprise Ready ($50+/month)
**Target**: 10000+ users
- Consider migration to Alibaba Cloud/Tencent Cloud for China market
- Multi-region deployment
- Advanced monitoring and analytics

### Production Environment Variables

**Required for Railway deployment**:
```bash
DATABASE_URL=postgresql://user:pass@host:port/db  # Auto-provided by Railway
JWT_SECRET=your-production-secret-key
NODE_ENV=production
PORT=3001  # Railway will override this
API_URL=https://your-app.railway.app
```

### Deployment Configuration

**Railway Configuration** (`railway.json`):
```json
{
  "build": {
    "command": "npm run build:all"
  },
  "start": {
    "command": "npm start"
  },
  "environment": {
    "NODE_ENV": "production"
  }
}
```

**Package.json scripts** (updated):
```json
{
  "scripts": {
    "build:all": "npm run build:client && npm run build:admin",
    "start": "node server/index.js",
    "deploy:staging": "railway up --environment staging",
    "deploy:production": "railway up --environment production"
  }
}
```

### Monitoring & Maintenance

**Health Checks**:
- API endpoint monitoring
- Database connection monitoring
- Error rate tracking
- Performance metrics

**Backup Strategy**:
- Railway automatic database backups
- Weekly full database exports
- Configuration backup to Git

## Development Workflow (Local First)

### Primary Development Flow

1. **Setup and Start**:
   - Install dependencies: `npm install && cd admin && npm install`
   - Initialize database: `npm run db:init`
   - Start all services: `npm run dev` (or individual services)

2. **Feature Development**:
   - Work on client app: Focus on `src/` directory 
   - Work on admin panel: Focus on `admin/` directory
   - Work on API: Focus on `server/` directory
   - Real-time hot reload for all layers

3. **Database Changes**:
   - Modify schema in `server/database/schema.sql`
   - Reset database: `npm run db:reset` 
   - Re-seed data: `npm run db:seed`

4. **API Development**:
   - Add endpoints in `server/routes/`
   - Test with local frontend immediately
   - Use Thunder Client/Postman for API testing
   - All changes reflected instantly with nodemon

### Development Priorities

**Phase 1: Core Functionality (Focus Here)**
- ✅ Get basic client and admin apps running
- ✅ Implement user authentication (simple JWT)
- ✅ Build locker application flow
- ✅ Build admin approval workflow
- ✅ Ensure data flows between all layers

**Phase 2: Enhancement**  
- Polish UI/UX for both applications
- Add form validations and error handling
- Implement search and filtering features
- Add file upload capabilities (if needed)

**Phase 3: Future Deployment**
- Only consider deployment after local functionality is perfect
- Choose deployment strategy based on final architecture

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