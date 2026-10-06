import cron from "node-cron";
import { pushService } from "../services/push.service";

export function startPushJobs() {
  console.log("push jobs: scheduler started");

  cron.schedule(
    "0 9 * * *", // daily at 9 AM Asia/Dhaka
    () =>
      pushService
        .sendInactivityReminders()
        .catch((e) => console.error("inactivity job failed", e)),
    { timezone: "Asia/Dhaka" },
  );
}