import { api } from "@/lib/api";
import { getDeviceId } from "@/lib/device-id";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function registerPush() {
  console.log("push: start");
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("push: not supported");
    return;
  }

  const permission = await Notification.requestPermission();
  console.log("push: permission =", permission);
  if (permission !== "granted") return;

  await navigator.serviceWorker.register("/sw.js");
  const reg = await navigator.serviceWorker.ready;
  console.log("push: sw ready", reg);
  console.log("push: sw registered", reg);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  console.log("push: vapid key present =", !!vapidKey);
  if (!vapidKey) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing");

  let sub = await reg.pushManager.getSubscription();
  console.log("push: existing subscription =", !!sub);

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    } catch (e: any) {
      console.error("push: subscribe failed ->", e?.name, e?.message);
      throw e;
    }
  }
  console.log("push: subscribed", sub.endpoint);
  console.log("push: sending subscribe");
  await api.post("/push/subscribe", {
    deviceId: getDeviceId(),
    subscription: sub.toJSON(),
  });
  console.log("push: done");
}
