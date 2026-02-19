/**
 * UserService.hardDeleteUser tests
 *
 * Verifies the hard-delete method:
 * - Deletes UserSession rows (no FK cascade)
 * - Deletes the User row (FK cascade handles the rest)
 * - Blocks in production
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    userSession: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  },
}));

// Import AFTER mock registration
import { UserService } from './user.service';
import { prisma } from '../lib/prisma';

const service = new UserService();

// Typed references to the mocks
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockDeleteManySessions = prisma.userSession.deleteMany as unknown as ReturnType<typeof vi.fn>;
const mockDeleteUser = (prisma.user as any).delete as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: $transaction executes the callback with the prisma client
  mockTransaction.mockImplementation(async (fn: Function) => fn(prisma));
  mockDeleteManySessions.mockResolvedValue({ count: 2 });
  mockDeleteUser.mockResolvedValue({ id: 'user-1' });
});

describe('UserService.hardDeleteUser', () => {
  it('deletes user sessions then the user in a transaction', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    await service.hardDeleteUser('user-1');

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockDeleteManySessions).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mockDeleteUser).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('calls session delete before user delete', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const callOrder: string[] = [];

    mockDeleteManySessions.mockImplementation(async () => {
      callOrder.push('sessions');
      return { count: 0 };
    });
    mockDeleteUser.mockImplementation(async () => {
      callOrder.push('user');
      return { id: 'user-1' };
    });

    await service.hardDeleteUser('user-1');

    expect(callOrder).toEqual(['sessions', 'user']);
  });

  it('throws in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(service.hardDeleteUser('user-1')).rejects.toThrow(
      'Hard delete is not available in production'
    );

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('does not swallow transaction errors', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    mockDeleteUser.mockRejectedValue(new Error('FK violation'));

    await expect(service.hardDeleteUser('user-1')).rejects.toThrow('FK violation');
  });
});
