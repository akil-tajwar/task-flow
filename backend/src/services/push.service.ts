import webpush from "web-push";
import { and, eq, isNull, lt, exists, sql } from "drizzle-orm";
import { db } from "../db/index";
import { pushSubscriptions } from "../db/schema/index.schema";
import { tasks } from "../db/schema/tasks.schema";
import type { PushSubscribeInput } from "../validators/push.validator";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export const pushService = {
  // =========================================================
  // SUBSCRIPTIONS
  // =========================================================

  async subscribe(tenantId: string, userId: string, input: PushSubscribeInput) {
    const values = {
      tenantId,
      userId,
      deviceId: input.deviceId,
      endpoint: input.subscription.endpoint,
      p256dh: input.subscription.keys.p256dh,
      auth: input.subscription.keys.auth,
      lastLoginAt: new Date(),
      lastNotifiedAt: null,
    };

    await db
      .insert(pushSubscriptions)
      .values(values)
      .onConflictDoUpdate({ target: pushSubscriptions.deviceId, set: values });

    return { message: "Subscribed" };
  },

  async unsubscribe(deviceId: string, userId: string) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.deviceId, deviceId),
          eq(pushSubscriptions.userId, userId),
        ),
      );

    return { message: "Unsubscribed" };
  },

  async touchLogin(deviceId: string, userId: string) {
    await db
      .update(pushSubscriptions)
      .set({ userId, lastLoginAt: new Date(), lastNotifiedAt: null })
      .where(eq(pushSubscriptions.deviceId, deviceId));
  },

  // =========================================================
  // INACTIVITY REMINDERS (used by the cron job)
  // =========================================================

  async sendInactivityReminders() {
    console.log("push job: running");
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db.query.pushSubscriptions.findMany({
      where: and(
        lt(pushSubscriptions.lastLoginAt, cutoff),
        isNull(pushSubscriptions.lastNotifiedAt),
        // Only notify if the user has at least one task assigned
        exists(
          db
            .select({ one: sql`1` })
            .from(tasks)
            .where(eq(tasks.assigneeId, pushSubscriptions.userId)),
        ),
      ),
    });

    console.log("push job: matched rows =", rows.length);

    for (const r of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          JSON.stringify({
            title: "TaskFlow",
            body: "You haven't logged in since yesterday. Check your tasks.",
            url: process.env.FRONTEND_URL ?? "/",
          }),
        );
        console.log("push job: sent to", r.id);

        await db
          .update(pushSubscriptions)
          .set({ lastNotifiedAt: new Date() })
          .where(eq(pushSubscriptions.id, r.id));
      } catch (err: any) {
        console.error(
          "push job: failed",
          r.id,
          err?.statusCode,
          err?.body ?? err,
        );
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, r.id));
        } else {
          console.error("push failed", r.id, err);
        }
      }
    }
  },
};
