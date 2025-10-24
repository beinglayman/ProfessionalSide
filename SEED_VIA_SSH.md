# Seed Reference Data via Azure SSH

Since direct database connection from localhost is blocked by Azure firewall, we need to seed data from within the Azure container.

## Step 1: SSH into Backend

```bash
az webapp ssh -g ps-prod-rg -n ps-backend-1758551070
```

## Step 2: Create Quick Seed Script

Once inside the SSH session, run:

```bash
cd /app

cat > quick-seed.cjs << 'SEEDSCRIPT'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = {
  focusAreas: [
    { id: 'engineering', label: 'Engineering', description: 'Software development and technical roles' },
    { id: 'product', label: 'Product', description: 'Product management and strategy' },
    { id: 'design', label: 'Design', description: 'UX/UI and creative design' },
    { id: 'marketing', label: 'Marketing', description: 'Marketing and growth' },
    { id: 'sales', label: 'Sales', description: 'Sales and business development' },
    { id: 'operations', label: 'Operations', description: 'Operations and logistics' },
    { id: 'finance', label: 'Finance', description: 'Finance and accounting' },
    { id: 'people', label: 'People', description: 'HR and people operations' }
  ],

  categories: {
    engineering: [
      { id: 'frontend-eng', label: 'Frontend Development', workTypes: ['UI Implementation', 'State Management', 'Frontend Performance', 'Responsive Design', 'Accessibility'] },
      { id: 'backend-eng', label: 'Backend Development', workTypes: ['API Development', 'Database Design', 'Business Logic', 'Authentication', 'Caching'] },
      { id: 'devops', label: 'DevOps', workTypes: ['CI/CD Pipeline', 'Infrastructure', 'Monitoring', 'Deployment', 'Containerization'] },
      { id: 'testing', label: 'Testing & QA', workTypes: ['Unit Testing', 'Integration Testing', 'E2E Testing', 'Performance Testing', 'Test Automation'] }
    ],
    product: [
      { id: 'product-strategy', label: 'Product Strategy', workTypes: ['Product Roadmap', 'Market Research', 'Competitive Analysis', 'Product Vision', 'OKRs'] },
      { id: 'product-execution', label: 'Product Execution', workTypes: ['Feature Definition', 'User Stories', 'Sprint Planning', 'Backlog Management', 'Stakeholder Management'] }
    ],
    design: [
      { id: 'ux-design', label: 'UX Design', workTypes: ['User Research', 'Wireframing', 'Prototyping', 'User Testing', 'Information Architecture'] },
      { id: 'ui-design', label: 'UI Design', workTypes: ['Visual Design', 'Design Systems', 'Iconography', 'Typography', 'Color Theory'] }
    ],
    marketing: [
      { id: 'growth', label: 'Growth Marketing', workTypes: ['SEO', 'Content Marketing', 'Email Marketing', 'Social Media', 'Analytics'] },
      { id: 'brand', label: 'Brand & Communications', workTypes: ['Brand Strategy', 'PR', 'Content Creation', 'Copywriting', 'Community Management'] }
    ],
    sales: [
      { id: 'sales-strategy', label: 'Sales Strategy', workTypes: ['Sales Planning', 'Territory Management', 'Pipeline Development', 'Forecasting', 'Sales Enablement'] },
      { id: 'sales-execution', label: 'Sales Execution', workTypes: ['Prospecting', 'Demo/Presentation', 'Negotiation', 'Closing', 'Account Management'] }
    ],
    operations: [
      { id: 'ops-management', label: 'Operations Management', workTypes: ['Process Optimization', 'Resource Planning', 'Vendor Management', 'Quality Control', 'Supply Chain'] }
    ],
    finance: [
      { id: 'financial-planning', label: 'Financial Planning', workTypes: ['Budgeting', 'Forecasting', 'Financial Modeling', 'Cost Analysis', 'Reporting'] }
    ],
    people: [
      { id: 'talent-acquisition', label: 'Talent Acquisition', workTypes: ['Recruiting', 'Interviewing', 'Onboarding', 'Employer Branding', 'Talent Pipeline'] },
      { id: 'people-ops', label: 'People Operations', workTypes: ['Performance Management', 'Compensation', 'Benefits', 'Employee Relations', 'Culture'] }
    ]
  }
};

async function seed() {
  console.log('🌱 Seeding work categories and types...\n');

  try {
    let totalCategories = 0;
    let totalWorkTypes = 0;

    for (const [focusAreaId, categories] of Object.entries(data.categories)) {
      const focusArea = await prisma.focusArea.findUnique({ where: { id: focusAreaId } });
      if (!focusArea) continue;

      for (const category of categories) {
        const cat = await prisma.workCategory.upsert({
          where: { id: category.id },
          update: {},
          create: { id: category.id, label: category.label, focusAreaId: focusArea.id }
        });
        totalCategories++;

        const workTypesToCreate = category.workTypes.map(label => ({ label, workCategoryId: cat.id }));
        await prisma.workType.createMany({ data: workTypesToCreate, skipDuplicates: true });
        totalWorkTypes += workTypesToCreate.length;

        console.log(`  ✓ ${focusArea.label}: ${category.label} (${workTypesToCreate.length} types)`);
      }
    }

    // Create common skills
    const skills = ['Written Communication', 'Verbal Communication', 'Team Leadership', 'Mentoring', 'JavaScript', 'Python', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'Docker', 'AWS', 'Project Management', 'Agile/Scrum', 'Product Strategy', 'Figma', 'UI Design', 'UX Research', 'Data Analysis', 'Problem Solving'];
    await prisma.skill.createMany({ data: skills.map(name => ({ name })), skipDuplicates: true });

    console.log(`\n✅ Seeded ${totalCategories} categories, ${totalWorkTypes} work types, ${skills.length} skills`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
SEEDSCRIPT
```

## Step 3: Run the Seed Script

```bash
node quick-seed.cjs
```

You should see output like:
```
🌱 Seeding work categories and types...

  ✓ Engineering: Frontend Development (5 types)
  ✓ Engineering: Backend Development (5 types)
  ...

✅ Seeded 18 categories, 90 work types, 21 skills
```

## Step 4: Verify

Check that work categories appear:
```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.workCategory.findMany({include:{focusArea:true}}).then(r=>console.log(r.length+' categories')).finally(()=>p.\$disconnect());"
```

## Step 5: Exit SSH

```bash
exit
```

## Step 6: Test Frontend

Visit your frontend and you should now see work categories in dropdown menus!

---

## Alternative: If SSH Doesn't Work

You can also try adding your IP to Azure PostgreSQL firewall rules:

```bash
# Get your public IP
MY_IP=$(curl -s https://api.ipify.org)

# Add firewall rule
az postgres flexible-server firewall-rule create \
  --resource-group ps-prod-rg \
  --name pspg1758551070 \
  --rule-name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# Then run seed from localhost
cd backend
export DATABASE_URL='postgresql://psuser:wVnjV5pfU9SnY4IV68hmdFZFhzFSon8@pspg1758551070.postgres.database.azure.com:5432/psdbprod?sslmode=require'
node quick-reference-seed.cjs
```
