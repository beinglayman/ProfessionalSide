const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedComprehensiveWorkTypeSkills() {
  console.log('🔗 Starting comprehensive Work Type-Skills mapping...\n');

  try {
    // Fetch all work types and skills
    console.log('📥 Fetching data from database...');
    const [workTypes, skills] = await Promise.all([
      prisma.workType.findMany({ select: { id: true, label: true, workCategoryId: true } }),
      prisma.skill.findMany({ select: { id: true, name: true, category: true } })
    ]);

    console.log(`Found ${workTypes.length} work types and ${skills.length} skills\n`);

    // Create lookup maps
    const skillIds = new Set(skills.map(s => s.id));
    const mappings = [];

    // Helper function to add skills if they exist
    const addSkills = (workTypeId, skillList) => {
      skillList.forEach(skillId => {
        if (skillIds.has(skillId)) {
          mappings.push({ workTypeId, skillId });
        }
      });
    };

    // Base skills for all work types
    const baseSoftSkills = ['communication', 'problem-solving', 'teamwork'];

    console.log('🧠 Generating intelligent skill mappings...\n');

    // Process each work type
    for (const workType of workTypes) {
      const id = workType.id;
      const label = workType.label.toLowerCase();
      const categoryId = workType.workCategoryId;

      // Category-based base skills
      if (categoryId.startsWith('development-')) {
        addSkills(id, ['problem-solving', 'critical-thinking']);

        // Frontend
        if (categoryId.includes('frontend')) {
          addSkills(id, ['javascript', 'typescript', 'html5', 'css3', 'react']);
          if (label.includes('ui') || label.includes('implementation')) {
            addSkills(id, ['vue', 'angular']);
          }
          if (label.includes('performance')) {
            addSkills(id, ['webpack', 'vite']);
          }
          if (label.includes('accessibility')) {
            addSkills(id, ['html5', 'css3']);
          }
          if (label.includes('state')) {
            addSkills(id, ['react', 'vue']);
          }
        }

        // Backend
        if (categoryId.includes('backend')) {
          addSkills(id, ['nodejs', 'python', 'java']);
          if (label.includes('api')) {
            addSkills(id, ['express', 'fastapi', 'nodejs']);
          }
          if (label.includes('database')) {
            addSkills(id, ['sql', 'postgresql', 'mysql', 'mongodb']);
          }
          if (label.includes('auth')) {
            addSkills(id, ['nodejs', 'python', 'java']);
          }
          if (label.includes('cach')) {
            addSkills(id, ['redis']);
          }
          if (label.includes('microservice')) {
            addSkills(id, ['docker', 'kubernetes']);
          }
        }

        // Architecture
        if (categoryId.includes('architecture')) {
          addSkills(id, ['nodejs', 'python', 'java', 'problem-solving', 'critical-thinking']);
          if (label.includes('system') || label.includes('design')) {
            addSkills(id, ['leadership']);
          }
        }

        // DevOps
        if (categoryId.includes('devops') || categoryId.includes('pipelines')) {
          addSkills(id, ['docker', 'kubernetes', 'terraform']);
          if (label.includes('ci') || label.includes('cd') || label.includes('pipeline')) {
            addSkills(id, ['jenkins', 'github-actions', 'gitlab-ci']);
          }
          if (label.includes('cloud')) {
            addSkills(id, ['aws', 'azure', 'gcp']);
          }
          if (label.includes('infrastructure')) {
            addSkills(id, ['terraform', 'ansible']);
          }
          if (label.includes('deployment')) {
            addSkills(id, ['docker', 'kubernetes']);
          }
        }

        // Mobile
        if (categoryId.includes('mobile')) {
          if (label.includes('ios') || label.includes('swift')) {
            addSkills(id, ['swift', 'ios-dev']);
          }
          if (label.includes('android') || label.includes('kotlin')) {
            addSkills(id, ['kotlin', 'java', 'android-dev']);
          }
          if (label.includes('cross-platform') || label.includes('react native') || label.includes('flutter')) {
            addSkills(id, ['react-native', 'flutter']);
          }
        }

        // Testing
        if (categoryId.includes('testing')) {
          addSkills(id, ['javascript', 'python', 'quality-assurance']);
        }

        // Data Engineering
        if (categoryId.includes('data-engineering')) {
          addSkills(id, ['python', 'sql', 'spark', 'kafka']);
        }

        // Documentation
        if (categoryId.includes('documentation')) {
          addSkills(id, ['communication', 'teamwork']);
        }
      }

      // Design work types
      if (categoryId.startsWith('design-')) {
        addSkills(id, ['figma', 'creativity', 'communication']);

        if (categoryId.includes('research')) {
          addSkills(id, ['user-research', 'critical-thinking']);
        }
        if (categoryId.includes('planning')) {
          addSkills(id, ['figma', 'sketch', 'user-research']);
        }
        if (categoryId.includes('interaction')) {
          addSkills(id, ['figma', 'sketch', 'adobe-xd', 'prototyping']);
          if (label.includes('wireframe') || label.includes('prototype')) {
            addSkills(id, ['principle', 'framer']);
          }
        }
        if (categoryId.includes('visual')) {
          addSkills(id, ['photoshop', 'illustrator']);
          if (label.includes('icon')) {
            addSkills(id, ['illustrator']);
          }
        }
        if (categoryId.includes('design-systems')) {
          addSkills(id, ['figma', 'sketch', 'leadership']);
        }
        if (categoryId.includes('collaboration')) {
          addSkills(id, ['communication', 'leadership', 'teamwork']);
        }
        if (categoryId.includes('testing')) {
          addSkills(id, ['user-research', 'figma']);
        }
      }

      // Product Management
      if (categoryId.startsWith('product-management-')) {
        addSkills(id, ['product-management', 'communication', 'leadership']);

        if (categoryId.includes('strategy')) {
          addSkills(id, ['business-strategy', 'market-research', 'competitive-analysis']);
        }
        if (categoryId.includes('discovery') || categoryId.includes('requirements')) {
          addSkills(id, ['user-research', 'agile']);
        }
        if (categoryId.includes('execution')) {
          addSkills(id, ['agile', 'scrum', 'project-management']);
        }
        if (categoryId.includes('analytics')) {
          addSkills(id, ['marketing-analytics']);
        }
        if (categoryId.includes('growth')) {
          addSkills(id, ['growth-hacking', 'marketing-analytics']);
        }
        if (categoryId.includes('technical')) {
          addSkills(id, ['javascript', 'python']);
        }
      }

      // Marketing
      if (categoryId.startsWith('marketing-')) {
        addSkills(id, ['digital-marketing', 'communication', 'creativity']);

        if (categoryId.includes('growth')) {
          addSkills(id, ['seo', 'sem', 'growth-hacking', 'conversion-optimization']);
        }
        if (categoryId.includes('content')) {
          addSkills(id, ['content-marketing', 'creativity']);
        }
        if (categoryId.includes('brand')) {
          addSkills(id, ['brand-management', 'content-marketing']);
        }
        if (categoryId.includes('product-marketing')) {
          addSkills(id, ['product-management', 'market-research']);
        }
        if (categoryId.includes('analytics')) {
          addSkills(id, ['marketing-analytics', 'conversion-optimization']);
        }

        // Specific work type patterns
        if (label.includes('seo')) {
          addSkills(id, ['seo']);
        }
        if (label.includes('social')) {
          addSkills(id, ['social-media-marketing']);
        }
        if (label.includes('email')) {
          addSkills(id, ['email-marketing']);
        }
      }

      // Sales
      if (categoryId.startsWith('sales-')) {
        addSkills(id, ['communication', 'negotiation']);

        if (categoryId.includes('strategy')) {
          addSkills(id, ['sales-strategy', 'business-development', 'lead-generation']);
        }
        if (categoryId.includes('execution')) {
          addSkills(id, ['sales-strategy', 'negotiation']);
          if (label.includes('demo') || label.includes('presentation')) {
            addSkills(id, ['public-speaking']);
          }
        }
        if (categoryId.includes('account-management')) {
          addSkills(id, ['account-management', 'customer-relationship-management', 'customer-success']);
        }
        if (categoryId.includes('operations')) {
          addSkills(id, ['sales-forecasting', 'customer-relationship-management']);
        }
      }

      // Operations
      if (categoryId.startsWith('operations-')) {
        addSkills(id, ['process-improvement', 'project-management', 'problem-solving']);

        if (label.includes('supply') || label.includes('logistics')) {
          addSkills(id, ['vendor-management']);
        }
        if (label.includes('quality')) {
          addSkills(id, ['quality-assurance']);
        }
      }

      // Finance
      if (categoryId.startsWith('finance-')) {
        addSkills(id, ['financial-analysis', 'critical-thinking']);

        if (categoryId.includes('planning')) {
          addSkills(id, ['business-strategy']);
        }
        if (categoryId.includes('accounting')) {
          addSkills(id, ['compliance']);
        }
      }

      // HR
      if (categoryId.startsWith('hr-')) {
        addSkills(id, ['communication', 'leadership']);

        if (categoryId.includes('talent-acquisition')) {
          addSkills(id, ['stakeholder-management']);
        }
      }

      // Legal
      if (categoryId.startsWith('legal-')) {
        addSkills(id, ['compliance', 'critical-thinking', 'negotiation']);
      }

      // Leadership
      if (categoryId.startsWith('leadership-')) {
        addSkills(id, ['leadership', 'communication', 'mentoring', 'stakeholder-management']);
      }

      // Strategy
      if (categoryId.startsWith('strategy-')) {
        addSkills(id, ['business-strategy', 'critical-thinking', 'leadership']);
      }
    }

    console.log(`📊 Generated ${mappings.length} work type-skill mappings`);
    console.log('💾 Inserting mappings in batch...\n');

    // Batch insert
    const result = await prisma.workTypeSkill.createMany({
      data: mappings,
      skipDuplicates: true
    });

    console.log(`✅ Successfully created ${result.count} new work type-skill mappings!`);

    // Stats
    const totalMappings = await prisma.workTypeSkill.count();
    const workTypesWithSkills = await prisma.workType.count({
      where: { workTypeSkills: { some: {} } }
    });

    console.log(`\n📈 Final Statistics:`);
    console.log(`   Total mappings: ${totalMappings}`);
    console.log(`   Work types with skills: ${workTypesWithSkills}/${workTypes.length} (${Math.round(workTypesWithSkills/workTypes.length*100)}%)`);
    console.log(`   Average skills per work type: ${(totalMappings/workTypesWithSkills).toFixed(1)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedComprehensiveWorkTypeSkills();
