# Complete Reference Data Seeding Instructions

## Why SSH Method is Best

The full `seed-reference-data.ts` file contains:
- **41 Work Categories**
- **300+ Work Types**
- **Comprehensive skills and focus areas**

Running this from localhost times out due to network latency, but running from inside Azure container works perfectly.

---

## Step-by-Step Instructions

### 1. SSH into Azure Backend

```bash
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
```

Wait for the prompt to appear (looks like: `root@<container-id>:/home#`)

### 2. Navigate to App Directory

```bash
cd /app
```

### 3. Run the Full Seed Script

```bash
npm run db:seed-reference
```

### 4. Wait for Completion

You'll see output like:
```
🌱 Starting reference data seeding...
📝 Seeding Focus Areas...
📂 Seeding Work Categories and Work Types...
  ✓ Development: Frontend (8 work types)
  ✓ Development: Backend (8 work types)
  ✓ Development: Architecture (8 work types)
  ... (continues for all categories)
🎯 Seeding Skills...
✅ Seeding completed!
```

This will take **2-5 minutes** to complete.

### 5. Verify Data Was Seeded

Still in SSH, check the counts:

```bash
# Check work categories
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.workCategory.count().then(c=>console.log('Categories:',c)).finally(()=>p.\$disconnect());"

# Check work types
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.workType.count().then(c=>console.log('Work Types:',c)).finally(()=>p.\$disconnect());"

# Check skills
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.skill.count().then(c=>console.log('Skills:',c)).finally(()=>p.\$disconnect());"
```

Expected counts:
- **Categories**: ~40-50
- **Work Types**: ~300-400
- **Skills**: ~100-200

### 6. Exit SSH

```bash
exit
```

### 7. Test in Your App

Visit https://inchronicle.com and:
- Go to "Create Journal Entry" or "Profile Setup"
- Check dropdown menus for work types
- You should now see all categories like:
  - **Engineering**: Frontend Development, Backend Development, DevOps, Testing, Documentation, Data Engineering
  - **Product**: Product Strategy, Discovery, Requirements, Execution, Analytics
  - **Design**: User Research, UX Planning, Interaction Design, Visual Design, Design Systems
  - **Marketing**: Growth Marketing, Content Marketing, Brand & Communications
  - **Sales**: Sales Strategy, Sales Execution, Account Management
  - **Operations**: Process Management, Supply Chain, Quality Control
  - **Finance**: Financial Planning, Accounting, Analysis
  - **People**: Talent Acquisition, People Operations, Learning & Development

---

## Troubleshooting

### If SSH Fails

Try restarting the backend first:
```bash
az webapp restart -g ps-prod-rg -n ps-backend-1758551070
# Wait 30 seconds
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
```

### If Seeding Fails

Check the error message. Common issues:
- **Database connection**: Restart backend and try again
- **Timeout**: The script is still running, be patient
- **Duplicate entries**: Safe to ignore, script uses `skipDuplicates`

### If Some Categories Missing

Run the seed script again - it's idempotent (safe to run multiple times):
```bash
npm run db:seed-reference
```

---

## What Gets Seeded

### Focus Areas (8)
- Engineering, Product, Design, Marketing, Sales, Operations, Finance, People

### Work Categories by Focus Area

**Engineering** (8 categories):
- Frontend Development, Backend Development, Architecture, DevOps, Mobile Development, Testing, Documentation, Data Engineering

**Design** (8 categories):
- User Research, UX Planning, Interaction Design, Visual Design, Design Systems, Design Collaboration, Specialized Design, Design Testing

**Product Management** (8 categories):
- Strategy, Discovery, Requirements, Execution, Analytics, Lifecycle, Growth, Technical PM

**Marketing** (5 categories):
- Growth Marketing, Content Marketing, Brand & Communications, Product Marketing, Marketing Analytics

**Sales** (4 categories):
- Sales Strategy, Sales Execution, Account Management, Sales Operations

**Operations** (4 categories):
- Process Management, Supply Chain, Quality Assurance, Facilities & Admin

**Finance** (3 categories):
- Financial Planning, Accounting, Financial Analysis

**People/HR** (3 categories):
- Talent Acquisition, People Operations, Learning & Development

### Work Types
Each category has 6-10 specific work types. For example:
- **Frontend Development**: UI Implementation, State Management, Frontend Performance, Responsive Design, Accessibility, etc.
- **Sales Execution**: Prospecting, Demo/Presentation, Negotiation, Closing, Account Management, etc.

### Skills
Common professional skills across all domains:
- Technical: JavaScript, Python, React, Node.js, SQL, Git, Docker, AWS
- Product: Product Strategy, Agile/Scrum, Roadmap Planning
- Design: Figma, UI Design, UX Research, Prototyping
- Business: Project Management, Data Analysis, Strategic Thinking

---

## Alternative: Quick Partial Seed (If Full Seed Fails)

If the full seed keeps failing, you can use the quick seed I created earlier. SSH in and run:

```bash
cd /app

cat > quick-seed.cjs << 'EOF'
// [Copy the script from quick-reference-seed.cjs in your backend directory]
EOF

node quick-seed.cjs
```

This seeds a minimal but functional set (18 categories, ~90 work types).

---

## Success Criteria

✅ SSH connection works
✅ Seed script runs without errors
✅ Verification commands show correct counts
✅ Frontend shows work categories in dropdowns
✅ Users can create journal entries with work types
✅ Profile onboarding shows all categories

---

**Ready to start? Run the SSH command above!**
