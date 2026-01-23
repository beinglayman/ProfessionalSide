import { describe, it, expect } from 'vitest';

/**
 * Tests for notification dropdown consistency logic
 *
 * The key bug fixed: Badge showed "1 unread" but dropdown showed "No notifications yet"
 * because two separate API calls had inconsistent results.
 *
 * Fix: Derive the badge count from the notifications list when available,
 * ensuring badge and dropdown are always in sync.
 */

// Type matching the Notification interface
interface MockNotification {
  id: string;
  isRead: boolean;
}

// Replicate the consistency logic from notifications-dropdown.tsx
function deriveNotificationState(
  notificationsData: { notifications: MockNotification[] } | undefined,
  unreadCountData: { count: number } | undefined
) {
  const notifications = notificationsData?.notifications || [];
  const derivedUnreadCount = notifications.filter(n => !n.isRead).length;

  // When list is available, use it as source of truth
  const hasUnread = notificationsData
    ? derivedUnreadCount > 0
    : (unreadCountData?.count || 0) > 0;

  const displayCount = notificationsData
    ? derivedUnreadCount
    : (unreadCountData?.count || 0);

  return { notifications, hasUnread, displayCount };
}

describe('Notification Dropdown Consistency', () => {
  describe('deriveNotificationState', () => {
    it('shows zero when both sources are undefined', () => {
      const result = deriveNotificationState(undefined, undefined);

      expect(result.hasUnread).toBe(false);
      expect(result.displayCount).toBe(0);
      expect(result.notifications).toEqual([]);
    });

    it('falls back to unreadCount when list is not loaded', () => {
      const result = deriveNotificationState(undefined, { count: 3 });

      expect(result.hasUnread).toBe(true);
      expect(result.displayCount).toBe(3);
      expect(result.notifications).toEqual([]);
    });

    it('uses list count when list is available (overrides count endpoint)', () => {
      const notificationsData = {
        notifications: [
          { id: '1', isRead: false },
          { id: '2', isRead: true },
        ],
      };
      // Count endpoint says 5, but list only has 1 unread
      const result = deriveNotificationState(notificationsData, { count: 5 });

      expect(result.hasUnread).toBe(true);
      expect(result.displayCount).toBe(1); // Derived from list, not count endpoint
      expect(result.notifications).toHaveLength(2);
    });

    it('shows zero when list is loaded but empty', () => {
      const result = deriveNotificationState(
        { notifications: [] },
        { count: 3 } // Count endpoint says 3, but list is empty
      );

      // List takes precedence - if list is empty, show empty
      expect(result.hasUnread).toBe(false);
      expect(result.displayCount).toBe(0);
    });

    it('correctly counts multiple unread notifications', () => {
      const notificationsData = {
        notifications: [
          { id: '1', isRead: false },
          { id: '2', isRead: false },
          { id: '3', isRead: false },
          { id: '4', isRead: true },
          { id: '5', isRead: true },
        ],
      };
      const result = deriveNotificationState(notificationsData, undefined);

      expect(result.hasUnread).toBe(true);
      expect(result.displayCount).toBe(3);
    });

    it('shows zero when all notifications are read', () => {
      const notificationsData = {
        notifications: [
          { id: '1', isRead: true },
          { id: '2', isRead: true },
        ],
      };
      const result = deriveNotificationState(notificationsData, { count: 0 });

      expect(result.hasUnread).toBe(false);
      expect(result.displayCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles count of 0 from API correctly', () => {
      const result = deriveNotificationState(undefined, { count: 0 });

      expect(result.hasUnread).toBe(false);
      expect(result.displayCount).toBe(0);
    });

    it('handles empty notifications array', () => {
      const result = deriveNotificationState({ notifications: [] }, undefined);

      expect(result.hasUnread).toBe(false);
      expect(result.displayCount).toBe(0);
      expect(result.notifications).toEqual([]);
    });
  });
});

describe('Bug Regression: Badge/Dropdown Mismatch', () => {
  it('REGRESSION: badge and dropdown should be consistent when list fails', () => {
    // Scenario: Count endpoint returns 1, but list endpoint fails
    // Before fix: badge=1, dropdown="No notifications"
    // After fix: both use same source of truth

    // When list is undefined (failed), fall back to count
    const resultWithoutList = deriveNotificationState(undefined, { count: 1 });
    expect(resultWithoutList.hasUnread).toBe(true);
    expect(resultWithoutList.displayCount).toBe(1);

    // When list loads successfully, use list
    const resultWithList = deriveNotificationState(
      { notifications: [{ id: '1', isRead: false }] },
      { count: 1 }
    );
    expect(resultWithList.hasUnread).toBe(true);
    expect(resultWithList.displayCount).toBe(1);

    // Key test: list is source of truth even if count differs
    const resultMismatch = deriveNotificationState(
      { notifications: [] }, // List says 0
      { count: 5 } // Count says 5
    );
    // List wins - prevents showing "5 unread" badge with empty dropdown
    expect(resultMismatch.hasUnread).toBe(false);
    expect(resultMismatch.displayCount).toBe(0);
  });
});
