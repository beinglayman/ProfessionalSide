import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';

const router = Router();

// All organization routes require authentication
router.use(authenticate);

// Validation schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  description: z.string().optional()
});

// Get all organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    sendSuccess(res, organizations, 'Organizations retrieved successfully');
  } catch (error) {
    console.error('Error fetching organizations:', error);
    sendError(res, 'Failed to fetch organizations', 500);
  }
});

// Create organization
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createOrganizationSchema.parse(req.body);

    // Check if organization with same name already exists
    const existingOrg = await prisma.organization.findFirst({
      where: { 
        name: { equals: validatedData.name, mode: 'insensitive' }
      }
    });

    if (existingOrg) {
      return void sendError(res, 'Organization with this name already exists', 400);
    }

    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
        domain: validatedData.domain,
        description: validatedData.description
      }
    });

    sendSuccess(res, organization, 'Organization created successfully', 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return void sendError(res, 'Validation failed', 400, error.errors);
    }
    console.error('Error creating organization:', error);
    sendError(res, 'Failed to create organization', 500);
  }
});

export default router;