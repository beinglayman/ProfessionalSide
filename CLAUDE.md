# InChronicle - Claude Development Guide

## Project Overview
InChronicle is a professional journaling and career development platform with React frontend and Node.js/Express backend, deployed on Azure. The platform helps professionals track their growth through structured journaling, networking, and goal management.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Radix UI
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL (Azure Flexible Server)
- **Deployment**: Azure (Container Apps with ACR)
- **Storage**: Azure Files (for uploads)
- **Authentication**: JWT with refresh tokens
- **State Management**: TanStack React Query

## Key Development Commands

### Frontend Development
```bash
npm run dev          # Start development server (port 5173)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build (port 4173)
```

### Backend Development
```bash
npm run dev          # Start development server with tsx watch
npm run build        # Build TypeScript to JavaScript
npm run start        # Production start with migrations and seeding
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed reference data
```

### Azure-Specific Commands
```bash
az webapp log tail -g ps-prod-rg -n ps-backend-1758551070   # View backend logs
az webapp log tail -g ps-prod-rg -n ps-frontend-1758551070  # View frontend logs
az webapp restart -g ps-prod-rg -n ps-backend-1758551070    # Restart backend
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070        # SSH into backend
```

## Common Development Patterns

### API Structure
- Base URL: `http://localhost:3002/api/v1` (development)
- Production: `https://ps-backend-1758551070.azurewebsites.net/api/v1`
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

### 🚨 CRITICAL DATABASE SCHEMA RULES
**NEVER modify database table names or naming conventions without explicit approval**

#### Current Schema Naming Patterns (DO NOT CHANGE):
```prisma
// ✅ CORRECT - Current schema patterns
model User {
  @@map("users")  // Table name: users
}

model UserProfile {
  @@map("user_profiles")  // Table name: user_profiles
}

model JournalEntry {
  @@map("journal_entries")  // Table name: journal_entries
}

model WorkspaceMember {
  @@map("workspace_members")  // Table name: workspace_members
}
```

#### Relationship Naming (FOLLOW EXACTLY):
```typescript
// ✅ CORRECT - Use exact relation names from schema
prisma.user.findMany({
  include: {
    profile: true,           // NOT profiles
    skills: true,            // NOT skill
    workspaceMemberships: true, // NOT workspaceMembers
    journalEntries: true     // NOT entries
  }
})

// ✅ CORRECT - Use exact table names in raw queries
prisma.journal_entries.findMany()  // NOT journalEntries table
prisma.user_profiles.findMany()    // NOT userProfiles table
```

#### Field Naming (CRITICAL):
```typescript
// ✅ CORRECT - Match schema field names exactly
where: {
  authorId: userId,    // NOT userId for journal entries
  workspaceId: id,     // NOT workspace_id
  skillId: skillId     // NOT skill_id
}
```

#### ❌ NEVER DO THESE:
- Change `@@map("table_name")` values
- "Fix" camelCase to snake_case in schema
- "Normalize" table names to follow different conventions
- Change relation names without checking all usage
- Modify field names for "consistency"

**Why**: Previous attempts to "fix" naming caused 500+ TypeScript errors and database corruption requiring emergency rollback.

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

### Database/Azure Issues
- Database connection: Verify DATABASE_URL in Azure App Settings
- Migrations: Run automatically on startup via migrate-and-start.js
- Skill mappings: Scripts in backend root for fixing unmapped work types
- Seeding: `az webapp ssh` then `npm run db:seed-reference`

### Frontend Issues
- API URL mismatches: Check VITE_API_URL in ACR build args (baked at build time)
- Authentication issues: Clear localStorage tokens
- Avatar upload: Check Azure Files mount at /app/uploads

### Azure Deployment Issues
- Container not starting: Check `az webapp log tail` for errors
- CORS errors: Verify CORS_ORIGINS and FRONTEND_URL in App Settings
- File uploads failing: Verify Azure Files mount and UPLOAD_VOLUME_PATH setting

### Development Workflow
1. Always run migrations before starting backend
2. Seed reference data for proper functionality
3. Use TypeScript strict mode - fix all type errors **CAREFULLY**
4. Follow existing component patterns in src/components/
5. Use React Query for all API state management
6. Maintain responsive design with Tailwind classes
7. **NEVER use mock data - always use real data from database via API calls**
8. Follow established UI design patterns and component library

### 🚨 TYPESCRIPT ERROR HANDLING GUIDELINES

#### Before Making Large-Scale Changes:
1. **COUNT ERRORS FIRST**: Run `npm run build 2>&1 | grep -c "error TS"` to get baseline
2. **ANALYZE PATTERNS**: Don't fix errors blindly - understand root causes
3. **TEST INCREMENTALLY**: Fix small batches and test functionality
4. **PRESERVE FUNCTIONALITY**: Development server should remain functional

#### Safe TypeScript Fixes:
✅ Missing return statements (`error TS7030`)
✅ Null/undefined checks (`error TS18048`)
✅ Property access fixes with known schema
✅ Type casting for known data structures

#### ⚠️ DANGEROUS TypeScript Fixes:
❌ Schema/table name changes
❌ Relation name modifications
❌ Large-scale property renaming
❌ Database field name changes
❌ Prisma client method changes

#### Error Count Guidelines:
- **0-50 errors**: Safe to fix systematically
- **50-200 errors**: Fix in small batches, test frequently
- **200+ errors**: STOP - likely schema issue, consider rollback
- **500+ errors**: EMERGENCY ROLLBACK required

**Priority**: Keep development server functional over perfect compilation

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3002/api/v1
```

### Backend (.env)
For local development, see `backend/.env.example`. For production Azure App Settings:
```bash
# View settings
az webapp config appsettings list -g ps-prod-rg -n ps-backend-1758551070

# Set settings
az webapp config appsettings set -g ps-prod-rg -n ps-backend-1758551070 \
  --settings DATABASE_URL=postgresql://... JWT_SECRET=... FRONTEND_URL=...
```

Required settings: NODE_ENV, PORT, WEBSITES_PORT, DATABASE_URL, FRONTEND_URL, CORS_ORIGINS, UPLOAD_DIR, UPLOAD_VOLUME_PATH, MAX_FILE_SIZE

## Testing Strategy
- Backend: Focus on API endpoints and database operations
- Frontend: Component testing for critical user flows
- Integration: Test onboarding and journal creation flows
- Use Azure staging slots for pre-production testing

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

## Analytics & Monitoring

### Microsoft Clarity
- **Integration**: User behavior analytics for understanding site usage
- **Project ID**: `tb149y3elh`
- **Location**: Tracking script in `/index.html`
- **Features**:
  - Session recordings with sensitive data masking
  - Interaction heatmaps
  - User flow analysis
  - Performance metrics
- **Privacy**: Disclosed in privacy policy at `/privacy`
- **Dashboard**: Access at https://clarity.microsoft.com

### Usage Analytics
- View Clarity dashboard for:
  - User interaction patterns
  - Common user flows
  - Rage clicks and dead clicks
  - Session replays for debugging
  - Device and browser distribution

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
- CORS configuration for Azure deployment
- File upload restrictions and validation with Azure Files
- SQL injection protection via Prisma
- Managed identities for ACR authentication

## Recent Development Focus
Based on recent commits, active areas include:
- Goals feature enhancements with comprehensive UI
- Azure migration and deployment automation
- Skill mapping completeness across all work types
- UI/UX improvements for onboarding and journal flows
- GitHub Actions CI/CD pipeline

## Debugging Tips
- Use `az webapp log tail` for production issues
- SSH into containers: `az webapp ssh -g ps-prod-rg -n <app-name>`
- Check browser dev tools for frontend API calls
- Prisma Studio for database inspection (local or via SSH)
- Azure Portal for monitoring and diagnostics
- Frontend console for authentication and routing issues

## Deployment Documentation
- **Full Azure Guide**: See AZURE_DEPLOYMENT.md
- **Infrastructure**: infra/azure-provision.sh and infra/.env.example
- **CI/CD**: .github/workflows/deploy-backend.yml and deploy-frontend.yml
- **Environment Config**: backend/.env.example for local development

## File Structure Notes
- Frontend components organized by feature area
- Backend follows MVC pattern with routes/controllers/services
- Shared types between frontend and backend
- Extensive script collection for database management
- Multiple environment-specific configurations