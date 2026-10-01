import cron from "node-cron";
import { pushService } from "../services/push.service";

export function startPushJobs() {
  console.log("push jobs: scheduler started");

  cron.schedule(
    "0 9 * * *", // for testing: every minute. Change to "* * * * *"
    () =>
      pushService
        .sendInactivityReminders()
        .catch((e) => console.error("inactivity job failed", e)),
    { timezone: "Asia/Dhaka" },
  );
}