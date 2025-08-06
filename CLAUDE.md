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

# Start admin panel dev server (port 5173)
npm run dev:admin

# Start Supabase local environment (API: port 54321, Studio: port 54323)
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

# Deploy to specific environments using helper scripts
npm run functions:deploy:dev
npm run functions:deploy:staging
npm run functions:deploy:prod

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

# Edge Functions testing (Deno tests)
npm run functions:test

# View function logs
npm run functions:logs
```

## Architecture Overview

### Three-Layer Architecture

1. **Frontend Layer** (uni-app + Vue 3 + TypeScript)
   - `src/` - User-facing app with pages for auth, locker operations, records
   - `admin/` - Admin panel with dashboard, approvals, user/locker management
   - Both use Pinia for state management and share similar component structures

2. **API Layer** (Supabase Edge Functions)
   - Located in `supabase/functions/`
   - Key endpoints: auth-register, auth-login, admin-login, lockers-apply, locker-operations, admin-approval, sms-send, reminder-check, auth-request-otp, auth-verify-otp, stores-lockers, admin-login-secure
   - Uses Deno runtime with TypeScript
   - Shared utilities in `_shared/` directory for security and common functions

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

## CI/CD and Deployment

### Automated Deployment (GitHub Actions)
The project uses GitHub Actions for automated deployment of Edge Functions:

- **Triggers**: Push to main, staging, or develop branches (when functions/ or migrations/ change)
- **Environment Detection**: Automatically maps branches to environments
  - `main` → production
  - `staging` → staging  
  - `develop` → development
- **Manual Deployment**: Use `workflow_dispatch` to deploy specific functions to chosen environments
- **Security Checks**: Validates TypeScript, checks for hardcoded secrets, prevents TODO markers in production
- **Health Checks**: Tests function endpoints after deployment

### Manual Deployment Scripts
For direct control, use the deployment script:
```bash
# Deploy all functions to development
./supabase/deploy-functions.sh development

# Deploy specific function to production  
./supabase/deploy-functions.sh production auth-login

# Deploy all functions to staging
./supabase/deploy-functions.sh staging all
```

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
   - Test locally with `npm run functions:serve` before deploying
   - Deploy individual function: `supabase functions deploy [function-name]`
   - Use deployment script for environment-specific deployments: `./supabase/deploy-functions.sh [environment] [function_name]`
   - All Edge Functions use Deno runtime and TypeScript
   - GitHub Actions automatically deploys functions on push to main/staging/develop branches

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

## Important Development Notes

### Port Configuration
- **User app**: 3000 (configured in vite.config.ts)
- **Admin panel**: 5173 (configured in admin/vite.config.ts)  
- **Supabase API**: 54321 (local development)
- **Supabase Studio**: 54323 (database interface)
- **Edge Functions**: Check console output when running `npm run functions:serve`

### Debugging and Logs
```bash
# View Edge Function logs
npm run functions:logs

# Check Supabase local services status
supabase status

# View specific function logs (when deployed)
supabase functions logs --function-name [function-name]

# Reset local database completely
supabase db reset
```

### Key Files to Check When Troubleshooting
- **Environment variables**: `.env.local` (not committed to repo)
- **Database schema**: `supabase/migrations/` directory
- **Function configuration**: `supabase/config.toml`
- **Deployment status**: `.github/workflows/deploy-functions.yml`
- **Build issues**: Check `uni-app` specific configurations in both vite.config.ts files

## Testing Accounts (Development)

- Admin: `13800000001` / `admin123`
- Store Admin: `13800000002` / `admin123`  
- SMS verification code: `123456` (dev environment only)