import { prisma } from '../lib/prisma';

const MAX_FOLLOWING = 100;

interface FollowResult {
  success: boolean;
  error?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class FollowService {
  async follow(followerId: string, followingId: string): Promise<FollowResult> {
    if (followerId === followingId) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    // Check cap
    const count = await prisma.follow.count({ where: { followerId } });
    if (count >= MAX_FOLLOWING) {
      return { success: false, error: `You can follow up to ${MAX_FOLLOWING} people. Unfollow someone first.` };
    }

    // Check duplicate
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (existing) {
      return { success: false, error: 'You already follow this user' };
    }

    await prisma.follow.create({ data: { followerId, followingId } });
    return { success: true };
  }

  async unfollow(followerId: string, followingId: string): Promise<FollowResult> {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!existing) {
      return { success: false, error: 'Not following this user' };
    }

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { success: true };
  }

  async getFollowing(followerId: string) {
    return prisma.follow.findMany({
      where: { followerId },
      include: { following: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowers(
    followingId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<{ followerId: string; createdAt: Date }>> {
    const [data, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId },
        include: { follower: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.follow.count({ where: { followingId } }),
    ]);
    return { data, total, page, pageSize };
  }

  async getFollowingCount(followerId: string): Promise<number> {
    return prisma.follow.count({ where: { followerId } });
  }

  async getFollowerCount(followingId: string): Promise<number> {
    return prisma.follow.count({ where: { followingId } });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!follow;
  }
}
