# Reference Data Seeding Instructions

This document provides instructions for seeding the database with comprehensive reference data for the InChronicle application.

## Overview

The reference data includes:
- **11 Primary Focus Areas** (Development, Design, Product Management, etc.)
- **Work Categories** organized by focus area
- **Work Types** organized by category  
- **140+ Skills** across technical, design, and professional domains
- **Work Type-Skill mappings** for the new journal entry workflow

## Database Tables

The seeding script populates these tables:
- `FocusArea` - Primary focus areas for professional work
- `WorkCategory` - Categories of work within each focus area
- `WorkType` - Specific types of work within each category
- `Skill` - Individual skills and competencies
- `WorkTypeSkill` - Junction table mapping skills to work types

## Running the Seeding Script

### Prerequisites
1. Ensure your database is running and accessible
2. Make sure you have run migrations: `npm run db:migrate`
3. Ensure Prisma client is generated: `npm run db:generate`

### Seeding Commands

```bash
# Navigate to the backend directory
cd backend

# Run the reference data seeding script
npm run db:seed-reference

# Alternative: Run with tsx directly
tsx prisma/seed-reference-data.ts
```

### Expected Output

When successful, you should see output like:
```
🌱 Starting reference data seeding...
📝 Seeding Focus Areas...
📂 Seeding Work Categories...
🔧 Seeding Work Types...
⚡ Seeding Skills...
🔗 Seeding Work Type Skills mappings...
✅ Reference data seeding completed successfully!

📊 Seeded data summary:
   🎯 11 Focus Areas
   📂 88 Work Categories
   🔧 160+ Work Types
   ⚡ 140+ Skills
   🔗 500+ Work Type-Skill mappings
```

## Data Structure

### Focus Areas
- Development
- Design  
- Product Management
- Marketing
- Sales
- Operations
- Finance
- HR
- Legal

### Example Data Flow
1. **Focus Area**: "Development"
2. **Work Category**: "Frontend" 
3. **Work Types**: "UI Implementation", "State Management", "Frontend Performance", etc.
4. **Skills**: Each work type maps to relevant skills like "React", "JavaScript", "TypeScript"

### New Hierarchical Structure
The updated seeding script uses a properly nested structure:
```
Focus Area (e.g. "development")
├── Work Category (e.g. "frontend") 
│   ├── Work Type (e.g. "ui-implementation")
│   ├── Work Type (e.g. "state-management") 
│   └── Work Type (e.g. "frontend-performance")
├── Work Category (e.g. "backend")
│   ├── Work Type (e.g. "api-development")
│   └── Work Type (e.g. "database-work")
```

## Verification

After seeding, you can verify the data was created:

```bash
# Open Prisma Studio to browse the data
npm run db:studio

# Or connect to your database directly and run:
# SELECT COUNT(*) FROM "FocusArea";
# SELECT COUNT(*) FROM "WorkCategory"; 
# SELECT COUNT(*) FROM "WorkType";
# SELECT COUNT(*) FROM "Skill";
# SELECT COUNT(*) FROM "WorkTypeSkill";
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify your `DATABASE_URL` in `.env`
   - Ensure PostgreSQL is running

2. **Migration Not Applied**
   - Run `npm run db:migrate` first
   - Then run the seeding script

3. **Prisma Client Out of Sync**
   - Run `npm run db:generate`
   - Then retry seeding

### Re-running the Script

The seeding script uses `upsert` operations, so it's safe to run multiple times. It will:
- Create new records if they don't exist
- Skip existing records without changes
- Not duplicate data

## Integration with Application

Once seeded, this reference data will be available through the API endpoints:
- `/api/reference/focus-areas` - Get all focus areas
- `/api/reference/work-categories/:focusAreaId` - Get categories for a focus area
- `/api/reference/work-types/:categoryId` - Get work types for a category  
- `/api/reference/skills/:workTypeIds` - Get skills for work types

This enables the new journal entry workflow to display proper reference data instead of "No focus areas available" messages.

## Next Steps

After seeding:
1. Test the new journal entry workflow in the frontend
2. Verify all dropdowns populate correctly
3. Confirm step-by-step progression works
4. Test skill recommendations based on work type selections