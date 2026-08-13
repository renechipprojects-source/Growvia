import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDPOw4C_4k5122v4K-oF943S1b05_9S_u55R1f-4";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (err) {
    console.warn("Service Worker registration notice:", err);
    return null;
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  return await Notification.requestPermission();
}

export async function subscribeToPushNotifications(userId: string, role: string): Promise<boolean> {
  const perm = await requestPushPermission();
  if (perm !== "granted") return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (sub) {
      const subJson = sub.toJSON();
      const payload = {
        id: `PUSH-${userId}-${Date.now()}`,
        message_type: "push_subscription",
        title: "Push Subscription",
        sender_id: userId,
        sender_role: role,
        recipient_user_id: userId,
        recipient_role: role,
        reason_or_notes: JSON.stringify({
          userId,
          role,
          subscription: subJson,
          updatedAt: new Date().toISOString(),
        }),
      };

      await supabase.from("gv_communications").insert([payload]);
      return true;
    }
  } catch (err) {
    console.warn("Web Push Subscription notice:", err);
  }
  return false;
}

export async function unsubscribeFromPushNotifications(userId: string): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }
    }
    await supabase.from("gv_communications").delete().eq("message_type", "push_subscription").eq("sender_id", userId);
  } catch {}
}

export async function sendWebPushNotification(
  recipientUserId: string,
  recipientRole: string,
  title: string,
  body: string,
  url: string = "/staff/messages"
): Promise<void> {
  try {
    // 1. Store in-app notification record
    const notifPayload = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      message_type: "notification",
      title,
      body,
      sender_id: getSession()?.loginId || "SYSTEM",
      recipient_user_id: recipientUserId,
      recipient_role: recipientRole,
      read_status: false,
      reason_or_notes: JSON.stringify({ url }),
      created_at: new Date().toISOString(),
    };

    await supabase.from("gv_communications").insert([notifPayload]);

    // 2. Trigger OS notification if page is backgrounded or Service Worker active
    if ("serviceWorker" in navigator && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        reg.showNotification(title, {
          body,
          icon: "/apple-touch-icon.png",
          badge: "/favicon.png",
          data: { url },
        });
      }
    }
  } catch (err) {
    console.warn("Notification dispatch notice:", err);
  }
}
