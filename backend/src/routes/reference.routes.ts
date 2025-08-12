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
        { id: 'finance-budgeting', label: 'Budgeting & Planning', description: 'Budget planning, forecasting, and variance analysis' },
        { id: 'finance-financial-analysis', label: 'Financial Analysis', description: 'Financial modeling, ratio analysis, and performance metrics' },
        { id: 'finance-investment', label: 'Investment Management', description: 'Investment decisions, portfolio management, and capital allocation' },
        { id: 'finance-risk-management', label: 'Risk Management', description: 'Financial risk assessment and mitigation strategies' },
        { id: 'finance-tax-planning', label: 'Tax Planning', description: 'Tax strategy, compliance, and optimization' },
        { id: 'finance-treasury', label: 'Treasury Management', description: 'Cash flow management, banking relationships, and liquidity' },
        { id: 'finance-audit', label: 'Audit & Compliance', description: 'Internal auditing, regulatory compliance, and controls' }
      ],

      // HR (currently has 1, adding 7 more)
      'hr': [
        { id: 'hr-employee-relations', label: 'Employee Relations', description: 'Employee engagement, conflict resolution, and workplace culture' },
        { id: 'hr-performance-management', label: 'Performance Management', description: 'Performance reviews, goal setting, and development planning' },
        { id: 'hr-compensation', label: 'Compensation & Benefits', description: 'Salary planning, benefits administration, and reward systems' },
        { id: 'hr-learning-development', label: 'Learning & Development', description: 'Training programs, career development, and skill building' },
        { id: 'hr-policy-compliance', label: 'Policy & Compliance', description: 'HR policies, legal compliance, and workplace regulations' },
        { id: 'hr-workforce-planning', label: 'Workforce Planning', description: 'Headcount planning, organizational design, and succession planning' },
        { id: 'hr-diversity-inclusion', label: 'Diversity & Inclusion', description: 'DEI initiatives, inclusive practices, and cultural transformation' }
      ],

      // Leadership (currently has 0, adding 8)
      'leadership': [
        { id: 'leadership-team-management', label: 'Team Management', description: 'Team building, delegation, and people management' },
        { id: 'leadership-strategic-planning', label: 'Strategic Leadership', description: 'Vision setting, strategic decision making, and organizational direction' },
        { id: 'leadership-change-management', label: 'Change Management', description: 'Leading organizational change, transformation, and adaptation' },
        { id: 'leadership-coaching-mentoring', label: 'Coaching & Mentoring', description: 'Employee development, coaching, and leadership mentoring' },
        { id: 'leadership-communication', label: 'Executive Communication', description: 'Leadership communication, presentations, and stakeholder management' },
        { id: 'leadership-decision-making', label: 'Decision Making', description: 'Strategic decisions, problem solving, and critical thinking' },
        { id: 'leadership-culture-building', label: 'Culture Building', description: 'Organizational culture, values, and workplace environment' },
        { id: 'leadership-crisis-management', label: 'Crisis Management', description: 'Crisis response, risk mitigation, and emergency leadership' }
      ],

      // Legal (currently has 1, adding 7 more)
      'legal': [
        { id: 'legal-regulatory-compliance', label: 'Regulatory Compliance', description: 'Regulatory adherence, compliance monitoring, and legal risk management' },
        { id: 'legal-intellectual-property', label: 'Intellectual Property', description: 'Patents, trademarks, copyrights, and IP strategy' },
        { id: 'legal-corporate-governance', label: 'Corporate Governance', description: 'Board governance, corporate structure, and legal entity management' },
        { id: 'legal-litigation', label: 'Litigation & Disputes', description: 'Legal disputes, litigation management, and conflict resolution' },
        { id: 'legal-privacy-data', label: 'Privacy & Data Protection', description: 'Data privacy laws, GDPR compliance, and information security' },
        { id: 'legal-employment-law', label: 'Employment Law', description: 'Labor law compliance, employment contracts, and workplace legal issues' },
        { id: 'legal-mergers-acquisitions', label: 'Mergers & Acquisitions', description: 'M&A transactions, due diligence, and corporate transactions' }
      ],

      // Operations (currently has 2, adding 6 more)
      'operations': [
        { id: 'operations-process-improvement', label: 'Process Improvement', description: 'Process optimization, efficiency improvements, and operational excellence' },
        { id: 'operations-supply-chain', label: 'Supply Chain Management', description: 'Vendor management, procurement, and supply chain optimization' },
        { id: 'operations-quality-assurance', label: 'Quality Assurance', description: 'Quality control, process standardization, and compliance monitoring' },
        { id: 'operations-facilities', label: 'Facilities Management', description: 'Office management, facility operations, and workplace services' },
        { id: 'operations-vendor-management', label: 'Vendor Management', description: 'Supplier relationships, contract management, and vendor performance' },
        { id: 'operations-business-continuity', label: 'Business Continuity', description: 'Disaster recovery, business continuity planning, and risk mitigation' }
      ],

      // Sales (currently has 4, adding 4 more)
      'sales': [
        { id: 'sales-lead-generation', label: 'Lead Generation', description: 'Lead qualification, demand generation, and pipeline development' },
        { id: 'sales-customer-retention', label: 'Customer Retention', description: 'Customer success, retention strategies, and churn prevention' },
        { id: 'sales-sales-training', label: 'Sales Training', description: 'Sales enablement, training programs, and skill development' },
        { id: 'sales-partnership', label: 'Partnership & Channels', description: 'Channel partnerships, partner management, and indirect sales' }
      ],

      // Strategy (currently has 0, adding 8)
      'strategy': [
        { id: 'strategy-business-strategy', label: 'Business Strategy', description: 'Business model development, competitive strategy, and market positioning' },
        { id: 'strategy-market-research', label: 'Market Research', description: 'Market analysis, competitive intelligence, and industry research' },
        { id: 'strategy-strategic-planning', label: 'Strategic Planning', description: 'Long-term planning, goal setting, and strategic roadmaps' },
        { id: 'strategy-mergers-acquisitions', label: 'M&A Strategy', description: 'Acquisition strategy, merger planning, and integration management' },
        { id: 'strategy-innovation', label: 'Innovation Strategy', description: 'Innovation planning, R&D strategy, and technology roadmaps' },
        { id: 'strategy-transformation', label: 'Digital Transformation', description: 'Digital strategy, transformation initiatives, and technology adoption' },
        { id: 'strategy-partnerships', label: 'Partnership Strategy', description: 'Strategic partnerships, alliance management, and ecosystem development' },
        { id: 'strategy-competitive-analysis', label: 'Competitive Analysis', description: 'Competitor research, market positioning, and competitive intelligence' }
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