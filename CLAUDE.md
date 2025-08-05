# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YesLocker is a billiard cue locker management system built with uni-app (H5), Supabase, and Vercel. It consists of:
- User-facing mini-app (src/) for cue locker applications and operations
- Admin panel (admin/) for approval and management
- Supabase backend with Edge Functions for APIs

## Tech Stack

- **Frontend**: uni-app + Vue 3 + TypeScript + Pinia
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth + JWT + Phone/SMS verification
- **Deployment**: Vercel
- **SMS Service**: Tencent Cloud SMS

## Essential Commands

### Development
```bash
# Start user app dev server (port 3000)
npm run dev

# Start admin panel dev server  
npm run dev:admin

# Start Supabase local environment
supabase start

# Start Edge Functions locally
npm run functions:serve
```

### Build & Deploy
```bash
# Build user app
npm run build

# Build admin panel
npm run build:admin

# Deploy Edge Functions to Supabase
npm run functions:deploy

# Run database migrations
npm run db:migrate

# Reset database (dev only)
npm run db:reset
```

### Code Quality
```bash
# Type checking
npm run type-check

# Linting (ESLint with auto-fix)
npm run lint
```

## Architecture Overview

### Three-Layer Architecture

1. **Frontend Layer** (uni-app + Vue 3 + TypeScript)
   - `src/` - User-facing app with pages for auth, locker operations, records
   - `admin/` - Admin panel with dashboard, approvals, user/locker management
   - Both use Pinia for state management and share similar component structures

2. **API Layer** (Supabase Edge Functions)
   - Located in `supabase/functions/`
   - Key endpoints: auth-register, auth-login, admin-login, lockers-apply, locker-operations, admin-approval
   - Uses Deno runtime with TypeScript

3. **Data Layer** (Supabase/PostgreSQL)
   - Core tables: users, stores, lockers, locker_records, applications, admins, reminders
   - Row Level Security (RLS) policies for data isolation
   - Migrations in `supabase/migrations/`

### Key Design Patterns

- **API Service Pattern**: Both apps use a service layer (`services/api/`) to encapsulate API calls
- **Store Pattern**: Pinia stores handle auth state and business logic
- **Component Organization**: Separated into `common/` (reusable) and `business/` (domain-specific) components
- **Authentication Flow**: JWT-based auth with Supabase, phone + SMS verification for users
- **Path Aliases**: Use `@/` for src directory imports (configured in vite.config.ts)

### Environment Configuration

- Development uses `.env.local` for Supabase keys and Tencent SMS config
- Production deployment on Vercel requires environment variables in dashboard
- Supabase config in `supabase/config.toml`
- Required environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TENCENT_SECRET_ID` (for SMS)
  - `TENCENT_SECRET_KEY` (for SMS)
  - `TENCENT_SMS_APP_ID`
  - `TENCENT_SMS_SIGN_NAME`

## Development Workflow

1. **Feature Development**:
   - Start local Supabase: `supabase start`
   - Run migrations if needed: `npm run db:migrate`
   - Start appropriate dev server: `npm run dev` or `npm run dev:admin`
   - Test Edge Functions locally: `npm run functions:serve`

2. **Database Changes**:
   - Create new migration file in `supabase/migrations/`
   - Test locally with `supabase db push`
   - Deploy to production with `supabase db push --linked`

3. **API Development**:
   - Edge Functions are in `supabase/functions/[function-name]/index.ts`
   - Test locally before deploying
   - Deploy individual function: `supabase functions deploy [function-name]`
   - All Edge Functions use Deno runtime and TypeScript

## Code Conventions

- **Component Files**: Use PascalCase for component files (e.g., `LoginForm.vue`)
- **Service Files**: Use kebab-case for service files (e.g., `api-service.ts`)
- **Type Definitions**: Keep types in dedicated `.d.ts` files or `types/` directories
- **API Calls**: Always use the service layer pattern in `services/api/`
- **State Management**: Use Pinia stores with clear naming (e.g., `useAuthStore`, `useLockerStore`)
- **Vue Composition API**: Use `<script setup>` syntax for Vue components
- **Error Handling**: Implement proper try-catch blocks and user-friendly error messages

## Project Structure

```
yeslocker/
├── src/                    # User app source
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   │   ├── common/       # Generic UI components
│   │   └── business/     # Domain-specific components
│   ├── stores/           # Pinia stores
│   ├── services/         # API services
│   └── types/            # TypeScript definitions
├── admin/                 # Admin panel source
│   └── (similar structure to src/)
├── supabase/             # Backend configuration
│   ├── functions/        # Edge Functions
│   └── migrations/       # Database migrations
└── docs/                 # Documentation
```

## Testing Accounts (Development)

- Admin: `13800000001` / `admin123`
- Store Admin: `13800000002` / `admin123`  
- SMS verification code: `123456` (dev environment only)