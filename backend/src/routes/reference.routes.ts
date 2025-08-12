import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route GET /api/reference/focus-areas
 * @desc Get all focus areas
 * @access Public
 */
router.get('/focus-areas', async (req, res) => {
  try {
    const focusAreas = await prisma.focusArea.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    res.json({
      success: true,
      data: focusAreas
    });
  } catch (error) {
    console.error('Error fetching focus areas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch focus areas'
    });
  }
});

/**
 * @route GET /api/reference/work-categories/:focusAreaId
 * @desc Get work categories for a specific focus area
 * @access Public
 */
router.get('/work-categories/:focusAreaId', async (req, res) => {
  try {
    const { focusAreaId } = req.params;
    
    const workCategories = await prisma.workCategory.findMany({
      where: {
        focusAreaId
      },
      orderBy: {
        id: 'asc'
      }
    });

    res.json({
      success: true,
      data: workCategories
    });
  } catch (error) {
    console.error('Error fetching work categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch work categories'
    });
  }
});

/**
 * @route GET /api/reference/work-types/:workCategoryId
 * @desc Get work types for a specific work category
 * @access Public
 */
router.get('/work-types/:workCategoryId', async (req, res) => {
  try {
    const { workCategoryId } = req.params;
    
    const workTypes = await prisma.workType.findMany({
      where: {
        workCategoryId
      },
      orderBy: {
        id: 'asc'
      }
    });

    res.json({
      success: true,
      data: workTypes
    });
  } catch (error) {
    console.error('Error fetching work types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch work types'
    });
  }
});

/**
 * @route GET /api/reference/skills
 * @desc Get all skills
 * @access Public
 */
router.get('/skills', async (req, res) => {
  try {
    const { category, workTypeId } = req.query;
    
    let whereClause = {};
    
    // Filter by category if provided
    if (category) {
      whereClause.category = category;
    }
    
    // Filter by work type if provided (skills associated with a specific work type)
    if (workTypeId) {
      whereClause.workTypeSkills = {
        some: {
          workTypeId
        }
      };
    }
    
    const skills = await prisma.skill.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      include: workTypeId ? {
        workTypeSkills: {
          where: { workTypeId },
          include: {
            workType: true
          }
        }
      } : undefined
    });

    res.json({
      success: true,
      data: skills
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    });
  }
});

/**
 * @route GET /api/reference/skills-for-work-type/:workTypeId
 * @desc Get skills associated with a specific work type
 * @access Public
 */
router.get('/skills-for-work-type/:workTypeId', async (req, res) => {
  try {
    const { workTypeId } = req.params;
    
    const workTypeSkills = await prisma.workTypeSkill.findMany({
      where: {
        workTypeId
      },
      include: {
        skill: true
      }
    });

    const skills = workTypeSkills.map(wts => wts.skill);

    res.json({
      success: true,
      data: skills
    });
  } catch (error) {
    console.error('Error fetching skills for work type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills for work type'
    });
  }
});

/**
 * @route GET /api/reference/skills-for-work-types
 * @desc Get skills associated with multiple work types
 * @access Public
 */
router.get('/skills-for-work-types', async (req, res) => {
  try {
    const { workTypeIds } = req.query;
    
    if (!workTypeIds) {
      return res.status(400).json({
        success: false,
        error: 'workTypeIds query parameter is required'
      });
    }
    
    // Parse workTypeIds (can be comma-separated string or array)
    const workTypeIdArray = Array.isArray(workTypeIds) 
      ? workTypeIds 
      : workTypeIds.split(',');
    
    const workTypeSkills = await prisma.workTypeSkill.findMany({
      where: {
        workTypeId: {
          in: workTypeIdArray
        }
      },
      include: {
        skill: true
      }
    });

    // Get unique skills (remove duplicates)
    const uniqueSkills = [];
    const skillIds = new Set();
    
    workTypeSkills.forEach(wts => {
      if (!skillIds.has(wts.skill.id)) {
        skillIds.add(wts.skill.id);
        uniqueSkills.push(wts.skill);
      }
    });

    // Sort by category and name
    uniqueSkills.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      data: uniqueSkills
    });
  } catch (error) {
    console.error('Error fetching skills for work types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills for work types'
    });
  }
});

/**
 * @route GET /api/reference/hierarchical-data/:focusAreaId
 * @desc Get complete hierarchical data for a focus area (categories, work types, and skills)
 * @access Public
 */
router.get('/hierarchical-data/:focusAreaId', async (req, res) => {
  try {
    const { focusAreaId } = req.params;
    
    const focusArea = await prisma.focusArea.findUnique({
      where: { id: focusAreaId },
      include: {
        workCategories: {
          include: {
            workTypes: {
              include: {
                workTypeSkills: {
                  include: {
                    skill: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!focusArea) {
      return res.status(404).json({
        success: false,
        error: 'Focus area not found'
      });
    }

    // Transform the data to include skills in work types
    const transformedData = {
      ...focusArea,
      workCategories: focusArea.workCategories.map(category => ({
        ...category,
        workTypes: category.workTypes.map(workType => ({
          ...workType,
          skills: workType.workTypeSkills.map(wts => wts.skill)
        }))
      }))
    };

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Error fetching hierarchical data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hierarchical data'
    });
  }
});

/**
 * TEMPORARY ENDPOINT - Remove after use
 * @route POST /api/reference/fix-design-skills
 * @desc Add missing design work type to skills mappings (one-time fix)
 * @access Public (temporary)
 */
router.post('/fix-design-skills', async (req, res) => {
  try {
    console.log('🎨 Adding missing design work type to skills mappings...');
    
    // Design work type to skills mappings
    const designSkillMappings = {
      // Design Testing work types
      'a-b-testing': ['figma', 'user-research', 'marketing-analytics'],
      'usability-studies': ['user-research', 'figma'],
      'design-validation': ['figma', 'user-research', 'sketch'],
      'concept-testing': ['user-research', 'figma'],
      'preference-testing': ['user-research', 'figma'],
      'benchmark-testing': ['user-research', 'competitive-analysis'],
      'first-click-testing': ['user-research', 'figma'],
      'eye-tracking': ['user-research'],
      
      // Visual Design work types
      'ui-mockups': ['figma', 'sketch', 'photoshop'],
      'style-guide-creation': ['figma', 'sketch', 'illustrator'],
      'iconography': ['illustrator', 'figma', 'sketch'],
      'illustration': ['illustrator', 'photoshop'],
      'typography': ['figma', 'sketch', 'photoshop'],
      'color-systems': ['figma', 'sketch'],
      'branding-elements': ['illustrator', 'photoshop', 'figma'],
      'data-visualization': ['figma', 'sketch'],
      
      // Interaction Design work types
      'wireframing': ['figma', 'sketch', 'adobe-xd'],
      'prototyping': ['figma', 'sketch', 'principle', 'framer'],
      'interaction-design': ['figma', 'sketch', 'adobe-xd'],
      'accessibility-design': ['figma', 'html5', 'css3'],
      'gesture-design': ['figma', 'sketch'],
      'animation-design': ['after-effects', 'principle', 'framer'],
      'responsive-design-planning': ['figma', 'css3'],
      'form-design': ['figma', 'sketch'],
      
      // Design Systems work types
      'component-design': ['figma', 'sketch'],
      'pattern-library': ['figma', 'sketch'],
      'design-tokens': ['figma'],
      'system-documentation': ['figma'],
      'design-system-governance': ['figma', 'leadership'],
      'component-variants': ['figma', 'sketch'],
      'system-adoption': ['figma', 'communication'],
      'system-versioning': ['figma'],
      
      // Design Collaboration work types
      'design-reviews': ['figma', 'communication'],
      'handoff-to-ui-design': ['figma', 'sketch'],
      'developer-collaboration': ['figma', 'communication'],
      'stakeholder-presentations': ['figma', 'communication'],
      'design-workshops': ['figma', 'leadership'],
      'cross-functional-alignment': ['communication', 'leadership'],
      'design-documentation': ['figma'],
      'design-advocacy': ['communication', 'leadership']
    };
    
    let mappingsAdded = 0;
    let mappingsSkipped = 0;
    const results = [];

    for (const [workTypeShortId, skillIds] of Object.entries(designSkillMappings)) {
      console.log(`🔍 Processing work type: ${workTypeShortId}`);
      
      // Find the work type by searching for work types that end with the short ID
      const workType = await prisma.workType.findFirst({
        where: { 
          id: { 
            endsWith: `-${workTypeShortId}` 
          } 
        }
      });
      
      if (workType) {
        console.log(`✅ Found work type: ${workType.id}`);
        const workTypeResults = [];
        
        for (const skillId of skillIds) {
          // Check if skill exists
          const skill = await prisma.skill.findUnique({
            where: { id: skillId }
          });
          
          if (skill) {
            // Check if mapping already exists
            const existingMapping = await prisma.workTypeSkill.findUnique({
              where: { 
                workTypeId_skillId: { 
                  workTypeId: workType.id, 
                  skillId: skill.id 
                } 
              }
            });
            
            if (!existingMapping) {
              await prisma.workTypeSkill.create({
                data: {
                  workTypeId: workType.id,
                  skillId: skill.id
                }
              });
              console.log(`  ➕ Added skill: ${skill.name}`);
              workTypeResults.push(`➕ Added: ${skill.name}`);
              mappingsAdded++;
            } else {
              console.log(`  ⏭️  Skipped skill (already exists): ${skill.name}`);
              workTypeResults.push(`⏭️ Skipped: ${skill.name}`);
              mappingsSkipped++;
            }
          } else {
            console.log(`  ❌ Skill not found: ${skillId}`);
            workTypeResults.push(`❌ Skill not found: ${skillId}`);
          }
        }
        
        results.push({
          workType: workType.id,
          shortId: workTypeShortId,
          skills: workTypeResults
        });
      } else {
        console.log(`  ❌ Work type not found for: ${workTypeShortId}`);
        results.push({
          workType: null,
          shortId: workTypeShortId,
          error: 'Work type not found'
        });
      }
    }

    console.log(`✅ Design skills mapping completed!`);
    
    res.json({
      success: true,
      message: 'Design skills mapping completed successfully',
      summary: {
        mappingsAdded,
        mappingsSkipped,
        totalProcessed: Object.keys(designSkillMappings).length
      },
      details: results
    });
    
  } catch (error) {
    console.error('❌ Error adding design skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add design skills mappings',
      details: error.message
    });
  }
});

export default router;