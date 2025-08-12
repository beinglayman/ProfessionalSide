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
 * @route POST /api/reference/add-missing-categories
 * @desc Add missing work categories for focus areas with less than 8 categories
 * @access Public (temporary)
 */
router.post('/add-missing-categories', async (req, res) => {
  try {
    console.log('🏗️ Adding missing work categories...');
    
    // Additional work categories to add
    const additionalCategories = {
      // Finance (currently has 1, adding 7 more)
      'finance': [
        { id: 'finance-budgeting', label: 'Budgeting & Planning' },
        { id: 'finance-financial-analysis', label: 'Financial Analysis' },
        { id: 'finance-investment', label: 'Investment Management' },
        { id: 'finance-risk-management', label: 'Risk Management' },
        { id: 'finance-tax-planning', label: 'Tax Planning' },
        { id: 'finance-treasury', label: 'Treasury Management' },
        { id: 'finance-audit', label: 'Audit & Compliance' }
      ],

      // HR (currently has 1, adding 7 more)
      'hr': [
        { id: 'hr-employee-relations', label: 'Employee Relations' },
        { id: 'hr-performance-management', label: 'Performance Management' },
        { id: 'hr-compensation', label: 'Compensation & Benefits' },
        { id: 'hr-learning-development', label: 'Learning & Development' },
        { id: 'hr-policy-compliance', label: 'Policy & Compliance' },
        { id: 'hr-workforce-planning', label: 'Workforce Planning' },
        { id: 'hr-diversity-inclusion', label: 'Diversity & Inclusion' }
      ],

      // Leadership (currently has 0, adding 8)
      'leadership': [
        { id: 'leadership-team-management', label: 'Team Management' },
        { id: 'leadership-strategic-planning', label: 'Strategic Leadership' },
        { id: 'leadership-change-management', label: 'Change Management' },
        { id: 'leadership-coaching-mentoring', label: 'Coaching & Mentoring' },
        { id: 'leadership-communication', label: 'Executive Communication' },
        { id: 'leadership-decision-making', label: 'Decision Making' },
        { id: 'leadership-culture-building', label: 'Culture Building' },
        { id: 'leadership-crisis-management', label: 'Crisis Management' }
      ],

      // Legal (currently has 1, adding 7 more)
      'legal': [
        { id: 'legal-regulatory-compliance', label: 'Regulatory Compliance' },
        { id: 'legal-intellectual-property', label: 'Intellectual Property' },
        { id: 'legal-corporate-governance', label: 'Corporate Governance' },
        { id: 'legal-litigation', label: 'Litigation & Disputes' },
        { id: 'legal-privacy-data', label: 'Privacy & Data Protection' },
        { id: 'legal-employment-law', label: 'Employment Law' },
        { id: 'legal-mergers-acquisitions', label: 'Mergers & Acquisitions' }
      ],

      // Operations (currently has 2, adding 6 more)
      'operations': [
        { id: 'operations-process-improvement', label: 'Process Improvement' },
        { id: 'operations-supply-chain', label: 'Supply Chain Management' },
        { id: 'operations-quality-assurance', label: 'Quality Assurance' },
        { id: 'operations-facilities', label: 'Facilities Management' },
        { id: 'operations-vendor-management', label: 'Vendor Management' },
        { id: 'operations-business-continuity', label: 'Business Continuity' }
      ],

      // Sales (currently has 4, adding 4 more)
      'sales': [
        { id: 'sales-lead-generation', label: 'Lead Generation' },
        { id: 'sales-customer-retention', label: 'Customer Retention' },
        { id: 'sales-sales-training', label: 'Sales Training' },
        { id: 'sales-partnership', label: 'Partnership & Channels' }
      ],

      // Strategy (currently has 0, adding 8)
      'strategy': [
        { id: 'strategy-business-strategy', label: 'Business Strategy' },
        { id: 'strategy-market-research', label: 'Market Research' },
        { id: 'strategy-strategic-planning', label: 'Strategic Planning' },
        { id: 'strategy-mergers-acquisitions', label: 'M&A Strategy' },
        { id: 'strategy-innovation', label: 'Innovation Strategy' },
        { id: 'strategy-transformation', label: 'Digital Transformation' },
        { id: 'strategy-partnerships', label: 'Partnership Strategy' },
        { id: 'strategy-competitive-analysis', label: 'Competitive Analysis' }
      ]
    };
    
    let categoriesAdded = 0;
    let categoriesSkipped = 0;
    const results = [];

    for (const [focusAreaId, categories] of Object.entries(additionalCategories)) {
      console.log(`📂 Processing focus area: ${focusAreaId}`);
      
      // Verify focus area exists
      const focusArea = await prisma.focusArea.findUnique({
        where: { id: focusAreaId }
      });
      
      if (!focusArea) {
        console.log(`❌ Focus area not found: ${focusAreaId}`);
        results.push({ focusArea: focusAreaId, error: 'Focus area not found' });
        continue;
      }
      
      const categoryResults = [];
      
      for (const category of categories) {
        // Check if category already exists
        const existingCategory = await prisma.workCategory.findUnique({
          where: { id: category.id }
        });
        
        if (existingCategory) {
          console.log(`  ⏭️  Skipped (already exists): ${category.label}`);
          categoryResults.push(`⏭️ Skipped: ${category.label}`);
          categoriesSkipped++;
        } else {
          // Create the work category
          await prisma.workCategory.create({
            data: {
              id: category.id,
              label: category.label,
              focusAreaId: focusAreaId
            }
          });
          console.log(`  ➕ Added: ${category.label}`);
          categoryResults.push(`➕ Added: ${category.label}`);
          categoriesAdded++;
        }
      }
      
      results.push({
        focusArea: focusAreaId,
        categories: categoryResults
      });
    }

    console.log(`✅ Work categories addition completed!`);
    
    res.json({
      success: true,
      message: 'Missing work categories added successfully',
      summary: {
        categoriesAdded,
        categoriesSkipped,
        focusAreasProcessed: Object.keys(additionalCategories).length
      },
      details: results
    });
    
  } catch (error) {
    console.error('❌ Error adding work categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add work categories',
      details: error.message
    });
  }
});

export default router;