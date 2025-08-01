const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define skill categories that can be applied to different work types
const skillCategories = {
  // Technical Skills
  frontend: ['HTML/CSS', 'JavaScript', 'React.js', 'Vue.js', 'Angular', 'TypeScript', 'Responsive Design', 'Web Development'],
  backend: ['API Development', 'Database Design', 'Node.js', 'Python', 'Java', 'Microservices', 'System Integration', 'Performance Optimization'],
  devops: ['CI/CD', 'Docker', 'Kubernetes', 'Infrastructure as Code', 'Cloud Computing', 'Monitoring', 'Automation', 'DevOps'],
  mobile: ['iOS Development', 'Android Development', 'React Native', 'Flutter', 'Mobile Development', 'Cross-platform Development', 'App Store Optimization', 'Mobile UI/UX'],
  testing: ['Unit Testing', 'Integration Testing', 'Test Automation', 'QA Testing', 'Performance Testing', 'Security Testing', 'Accessibility Testing', 'Manual Testing'],
  
  // Design Skills
  ux: ['User Research', 'User Experience Design', 'Usability Testing', 'Information Architecture', 'User Journey Mapping', 'Wireframing', 'Prototyping', 'Design Systems'],
  visual: ['Visual Design', 'Graphic Design', 'UI Design', 'Brand Design', 'Typography', 'Color Theory', 'Layout Design', 'Design Tools'],
  
  // Product Management Skills
  product: ['Product Strategy', 'Product Planning', 'Feature Prioritization', 'Market Research', 'User Research', 'Product Analytics', 'Go-to-Market Strategy', 'Product Roadmap'],
  analysis: ['Data Analysis', 'Market Research', 'Competitive Analysis', 'User Analytics', 'A/B Testing', 'Metrics Analysis', 'Business Intelligence', 'Statistical Analysis'],
  documentation: ['Technical Writing', 'Requirements Documentation', 'User Stories', 'API Documentation', 'Process Documentation', 'Knowledge Management', 'Content Strategy', 'Documentation Tools'],
  
  // System Architecture Skills
  architecture: ['System Design', 'Software Architecture', 'Scalability', 'Security Architecture', 'Database Architecture', 'Cloud Architecture', 'Microservices Architecture', 'Integration Architecture'],
  
  // Executive Skills
  leadership: ['Strategic Leadership', 'Team Leadership', 'Change Management', 'Stakeholder Management', 'Decision Making', 'Strategic Planning', 'Business Development', 'Executive Communication'],
  
  // General Skills
  agile: ['Agile Methodology', 'Scrum', 'Kanban', 'Sprint Planning', 'Backlog Management', 'Agile Coaching', 'Project Management', 'Team Collaboration'],
  communication: ['Communication', 'Presentation Skills', 'Stakeholder Management', 'Documentation', 'Team Collaboration', 'Client Relations', 'Cross-functional Collaboration', 'Conflict Resolution'],
  analytical: ['Problem Solving', 'Critical Thinking', 'Analytical Thinking', 'Data Analysis', 'Research Methods', 'Decision Making', 'Strategic Thinking', 'Innovation']
};

// Function to get relevant skills for a work type based on its category
function getSkillsForWorkType(workTypeId) {
  const skills = new Set();
  
  // Add skills based on work type category
  if (workTypeId.includes('dev-frontend')) {
    skillCategories.frontend.forEach(skill => skills.add(skill));
    skillCategories.testing.slice(0, 3).forEach(skill => skills.add(skill)); // Add some testing skills
  } else if (workTypeId.includes('dev-backend')) {
    skillCategories.backend.forEach(skill => skills.add(skill));
  } else if (workTypeId.includes('dev-devops')) {
    skillCategories.devops.forEach(skill => skills.add(skill));
  } else if (workTypeId.includes('design-ux')) {
    skillCategories.ux.forEach(skill => skills.add(skill));
  } else if (workTypeId.includes('design-visual')) {
    skillCategories.visual.forEach(skill => skills.add(skill));
  } else if (workTypeId.includes('pm-')) {
    skillCategories.product.forEach(skill => skills.add(skill));
    if (workTypeId.includes('analysis')) {
      skillCategories.analysis.slice(0, 4).forEach(skill => skills.add(skill));
    }
    if (workTypeId.includes('documentation')) {
      skillCategories.documentation.forEach(skill => skills.add(skill));
    }
  } else if (workTypeId.includes('sysarch')) {
    skillCategories.architecture.forEach(skill => skills.add(skill));
  } else if (workTypeId.includes('exec')) {
    skillCategories.leadership.forEach(skill => skills.add(skill));
  } else if (workTypeId.includes('qa')) {
    skillCategories.testing.forEach(skill => skills.add(skill));
  }
  
  // Add some general skills to every work type
  skillCategories.agile.slice(0, 3).forEach(skill => skills.add(skill));
  skillCategories.communication.slice(0, 3).forEach(skill => skills.add(skill));
  skillCategories.analytical.slice(0, 2).forEach(skill => skills.add(skill));
  
  // Convert to array and ensure we have exactly 8 skills
  const skillArray = Array.from(skills);
  
  // If we have more than 8, take the first 8
  if (skillArray.length > 8) {
    return skillArray.slice(0, 8);
  }
  
  // If we have fewer than 8, add some general skills
  while (skillArray.length < 8) {
    const generalSkills = [
      'Project Management', 'Team Collaboration', 'Process Improvement', 
      'Quality Assurance', 'Best Practices', 'Innovation', 'Continuous Learning', 'Industry Knowledge'
    ];
    
    for (const skill of generalSkills) {
      if (!skillArray.includes(skill) && skillArray.length < 8) {
        skillArray.push(skill);
      }
    }
    
    // If we still don't have 8, break to avoid infinite loop
    if (skillArray.length < 8) break;
  }
  
  return skillArray;
}

async function addSkillsToAllWorkTypes() {
  try {
    console.log('Starting to add skills to all work types...');
    
    // Get all work types
    const workTypes = await prisma.workType.findMany({
      include: {
        workTypeSkills: {
          include: {
            skill: true
          }
        }
      }
    });
    
    console.log('Found', workTypes.length, 'work types');
    
    // Get all existing skills to avoid duplicates
    const existingSkills = await prisma.skill.findMany();
    const skillMap = new Map();
    existingSkills.forEach(skill => {
      skillMap.set(skill.name.toLowerCase(), skill);
    });
    
    console.log('Found', existingSkills.length, 'existing skills');
    
    let totalSkillsAdded = 0;
    let totalMappingsAdded = 0;
    
    for (const workType of workTypes) {
      console.log(`\\nProcessing: ${workType.id} (${workType.label})`);
      
      // Get current skill count
      const currentSkillCount = workType.workTypeSkills.length;
      console.log(`  Current skills: ${currentSkillCount}/8`);
      
      if (currentSkillCount >= 8) {
        console.log(`  Already has 8+ skills, skipping...`);
        continue;
      }
      
      // Get existing skill mappings for this work type
      const existingMappings = new Set(workType.workTypeSkills.map(wts => wts.skillId));
      const existingSkillNames = new Set(workType.workTypeSkills.map(wts => wts.skill.name));
      
      // Get recommended skills for this work type
      const recommendedSkills = getSkillsForWorkType(workType.id);
      
      // Add skills until we have 8 or run out of recommended skills
      let addedCount = 0;
      for (const skillName of recommendedSkills) {
        if (existingSkillNames.has(skillName)) {
          continue; // Skip if already mapped
        }
        
        if (currentSkillCount + addedCount >= 8) {
          break; // Stop if we already have 8 skills
        }
        
        // Check if skill exists, if not create it
        let skill = skillMap.get(skillName.toLowerCase());
        if (!skill) {
          // Generate a unique ID for the skill
          const skillId = skillName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          let uniqueSkillId = `skill-${skillId}`;
          
          // Check if this ID already exists
          let counter = 1;
          while (await prisma.skill.findUnique({ where: { id: uniqueSkillId } })) {
            uniqueSkillId = `skill-${skillId}-${counter}`;
            counter++;
          }
          
          skill = await prisma.skill.create({
            data: {
              id: uniqueSkillId,
              name: skillName,
              category: 'technical'
            }
          });
          skillMap.set(skillName.toLowerCase(), skill);
          totalSkillsAdded++;
          console.log(`  Created skill: ${skillName}`);
        }
        
        // Create the mapping
        await prisma.workTypeSkill.create({
          data: {
            workTypeId: workType.id,
            skillId: skill.id
          }
        });
        totalMappingsAdded++;
        addedCount++;
        console.log(`  Added: ${skillName}`);
      }
      
      console.log(`  Added ${addedCount} skills to ${workType.label}`);
    }
    
    console.log('\\n=== SUMMARY ===');
    console.log('Total new skills created:', totalSkillsAdded);
    console.log('Total skill mappings added:', totalMappingsAdded);
    console.log('Work types processed:', workTypes.length);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

addSkillsToAllWorkTypes();