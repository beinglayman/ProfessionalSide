# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# InChronicle - Claude Development Guide

## Project Overview
InChronicle is a professional journaling and career development platform with React frontend and Node.js/Express backend, deployed on Railway. The platform helps professionals track their growth through structured journaling, networking, and goal management.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL (Railway hosted)
- **Deployment**: Railway (both frontend and backend)
- **Authentication**: JWT with refresh tokens
- **State Management**: TanStack React Query

## Key Development Commands

### Frontend Development (from project root)
```bash
npm run dev          # Start development server (port 5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build (port 4173)
```

### Backend Development (from backend/ directory)
```bash
cd backend
npm run dev          # Start development server with tsx watch
npm run build        # Build TypeScript to JavaScript
npm run start        # Production start with migrations and seeding
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed reference data
```

### Railway-Specific Commands
```bash
railway logs         # View deployment logs
railway status       # Check service status
railway redeploy     # Force redeploy
railway run <cmd>    # Run commands in Railway environment
```

### Database Management Scripts
```bash
# Reference data and seeding
npm run db:seed-reference      # Seed skills, work types, categories
npm run db:seed-complete       # Complete seeding with skill benchmarks

# Category and skill management
npm run check:railway-empty-categories    # Check for empty categories in Railway
npm run fix:empty-dynamic                 # Fix empty categories dynamically
npm run analyze:all-unmapped              # Find unmapped work types
npm run fix:all-unmapped                  # Fix unmapped work type mappings

# Supply chain specific fixes
npm run fix:supply-chain         # Fix supply chain visibility issues
npm run diagnose:supply-chain    # Diagnose supply chain skill mappings
```

## Common Development Patterns

### API Structure
- Base URL: `http://localhost:3002/api/v1` (development)
- Production: `https://api.inchronicle.com/api/v1`
- All API calls use axios with centralized configuration in `src/lib/api.ts`

### Authentication Flow
- JWT access tokens stored in localStorage as `inchronicle_access_token`
- Refresh tokens stored as `inchronicle_refresh_token`
- Auto-refresh implementation in axios interceptors
- Protected routes use AuthContext

### Database Management
- Prisma schema: `backend/prisma/schema.prisma`
- Main models: User, UserProfile, JournalEntry, Workspace, Skill, WorkType, Category
- Reference data seeding for skills/work types/categories
- Complex skill mapping system with focus areas

## Feature Areas

### Journal System
- Rich text editor using TipTap
- Entry types: Achievement, Learning, Challenge, Reflection
- Privacy levels: Private, Team, Network, Public
- AI-powered entry generation using Azure OpenAI
- Comments, likes, and rechronicle features

### Onboarding Flow
- Multi-step process: Professional basics → Skills/expertise → Work experience → Education → Certifications → Goals → Bio summary
- Dynamic skill selection with auto-completion
- Work type categorization across 8 focus areas
- Profile completion tracking

### Network & Workspace System
- Workspace-based collaboration
- Invitation system with email notifications
- Network policies and privacy controls
- Activity feeds and connection management

### Goals & Analytics
- SMART goals framework
- Progress tracking and milestones
- Dashboard with metrics visualization
- Achievement system

## Common Issues & Solutions

### Database/Railway Issues
- Empty categories: Use `npm run check:railway-empty-categories`
- Skill mappings: Scripts in backend root for fixing unmapped work types
- Deployment verification: `npm run verify:deployment`
- Supply chain category fixes: Multiple scripts available

### Frontend Issues
- API URL mismatches: Check VITE_API_URL environment variable
- Authentication issues: Clear localStorage tokens
- Avatar upload: Check uploads/avatars directory permissions

### Development Workflow
1. Always run migrations before starting backend
2. Seed reference data for proper functionality
3. Use TypeScript strict mode - fix all type errors
4. Follow existing component patterns in src/components/
5. Use React Query for all API state management
6. Maintain responsive design with Tailwind classes
7. **NEVER use mock data - always use real data from database via API calls**
8. Follow established UI design patterns and component library

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3002/api/v1
```

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_API_VERSION=2024-10-21
EMAIL_USER=...
EMAIL_PASS=...
```

## Testing Strategy
- Backend: Focus on API endpoints and database operations
- Frontend: Component testing for critical user flows
- Integration: Test onboarding and journal creation flows
- Use Railway environment for production testing

## UI Design Guidelines

### Color System
- **Primary**: Purple theme (#5D259F) with full scale (50-900)
- **Gray**: Neutral grays (#3C3C3C) with full scale (50-900)
- Use semantic color naming (primary-500, gray-200, etc.)
- Maintain consistent color usage across components

### Typography
- **Font Family**: Inter (sans-serif)
- Use consistent text sizing with Tailwind classes
- Maintain proper text hierarchy (headings, body, captions)

### Component Standards
- **Buttons**: Use standardized Button component with variants:
  - `default`: Primary purple background
  - `secondary`: Gray background
  - `outline`: White with border
  - `ghost`: Transparent with hover state
- **Sizing**: Consistent sizing system (sm, default, lg, icon)
- **Spacing**: Use Tailwind spacing scale consistently
- **Borders**: Rounded corners using `rounded-md` as default

### Layout Principles
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Component Organization**: Feature-based component structure
- **Accessibility**: Use Radix UI primitives for complex components
- **Consistency**: Follow existing patterns in src/components/

### Design Patterns
- Use Radix UI for complex interactive components
- Maintain consistent focus states and hover effects
- Use `cn()` utility for conditional className merging
- Follow shadcn/ui patterns for component composition

## Performance Considerations
- React Query caching for API responses
- Image optimization for avatars and uploads
- Database indexing on frequently queried fields
- Lazy loading for complex components
- Bundle splitting in Vite configuration

## Security Measures
- JWT token expiration and refresh
- Input validation with Zod schemas
- Rate limiting on API endpoints
- CORS configuration for Railway deployment
- File upload restrictions and validation
- SQL injection protection via Prisma

## Recent Development Focus
Based on recent commits, active areas include:
- Goals feature enhancements with comprehensive UI
- Empty category detection and fixing across focus areas
- Railway deployment optimization and database fixes
- Skill mapping completeness across all work types
- UI/UX improvements for onboarding and journal flows

## Debugging Tips
- Use `railway logs` for production issues
- Check browser dev tools for frontend API calls
- Prisma Studio for database inspection
- Backend log files in `backend/logs/` directory
- Frontend console for authentication and routing issues

## File Structure Notes
- Frontend components organized by feature area
- Backend follows MVC pattern with routes/controllers/services
- Shared types between frontend and backend
- Extensive script collection for database management
- Multiple environment-specific configurations