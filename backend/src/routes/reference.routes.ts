import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route GET /api/reference/focus-areas
 * @desc Get all focus areas
 * @access Public
 */
router.get('/focus-areas', async (req: Request, res: Response) => {
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
router.get('/work-categories/:focusAreaId', async (req: Request, res: Response) => {
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
router.get('/work-types/:workCategoryId', async (req: Request, res: Response) => {
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
router.get('/skills', async (req: Request, res: Response) => {
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
router.get('/skills-for-work-type/:workTypeId', async (req: Request, res: Response) => {
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
router.get('/skills-for-work-types', async (req: Request, res: Response): Promise<void> => {
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
router.get('/hierarchical-data/:focusAreaId', async (req: Request, res: Response): Promise<void> => {
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

export default router;