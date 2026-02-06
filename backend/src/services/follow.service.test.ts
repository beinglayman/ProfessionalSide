import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { FollowService } from './follow.service';

const prisma = new PrismaClient();
const FOLLOWER_ID = 'test-follow-user-a';
const FOLLOWING_ID = 'test-follow-user-b';

async function ensureTestUsers() {
  for (const id of [FOLLOWER_ID, FOLLOWING_ID]) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      await prisma.user.create({
        data: { id, email: `${id}@test.com`, name: id, password: 'hash' },
      });
    }
  }
}

async function cleanup() {
  await prisma.follow.deleteMany({
    where: { followerId: { startsWith: 'test-follow-' } },
  });
}

beforeAll(async () => { await ensureTestUsers(); });
afterEach(async () => { await cleanup(); });
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('FollowService', () => {
  const service = new FollowService();

  it('follows a user', async () => {
    const result = await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    expect(result.success).toBe(true);
  });

  it('prevents duplicate follows', async () => {
    await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    const result = await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already');
  });

  it('prevents self-follow', async () => {
    const result = await service.follow(FOLLOWER_ID, FOLLOWER_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('yourself');
  });

  it('unfollows a user', async () => {
    await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    const result = await service.unfollow(FOLLOWER_ID, FOLLOWING_ID);
    expect(result.success).toBe(true);
  });

  it('lists following', async () => {
    await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    const result = await service.getFollowing(FOLLOWER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].followingId).toBe(FOLLOWING_ID);
  });

  it('lists followers', async () => {
    await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    const result = await service.getFollowers(FOLLOWING_ID);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].followerId).toBe(FOLLOWER_ID);
  });

  it('enforces 100-follow cap', async () => {
    // Create 100 users and follow them
    const userIds: string[] = [];
    for (let i = 0; i < 100; i++) {
      const id = `test-follow-cap-${i}`;
      userIds.push(id);
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        await prisma.user.create({
          data: { id, email: `${id}@test.com`, name: id, password: 'hash' },
        });
      }
      await service.follow(FOLLOWER_ID, id);
    }

    // 101st should fail
    const extraId = 'test-follow-cap-extra';
    const existing = await prisma.user.findUnique({ where: { id: extraId } });
    if (!existing) {
      await prisma.user.create({
        data: { id: extraId, email: `${extraId}@test.com`, name: extraId, password: 'hash' },
      });
    }
    const result = await service.follow(FOLLOWER_ID, extraId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('100');

    // Cleanup cap users
    await prisma.follow.deleteMany({ where: { followerId: FOLLOWER_ID } });
    await prisma.user.deleteMany({ where: { id: { startsWith: 'test-follow-cap-' } } });
  });

  it('returns follow count', async () => {
    await service.follow(FOLLOWER_ID, FOLLOWING_ID);
    const count = await service.getFollowingCount(FOLLOWER_ID);
    expect(count).toBe(1);
  });
});
