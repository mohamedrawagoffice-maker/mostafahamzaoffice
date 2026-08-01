import { supabase } from "./supabaseClient";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = typeof window !== "undefined" ? window.atob(base64) : "";
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// بيسجل الـ Service Worker، يطلب إذن الإشعارات من المتصفح، ويخزن الاشتراك في قاعدة البيانات
export async function subscribeToPush(userId) {
  if (!isPushSupported()) throw new Error("المتصفح ده مش بيدعم الإشعارات، أو الموقع لازم يتفتح عن طريق https");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("مفتاح الإشعارات (VAPID) مش متظبط في إعدادات المشروع");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("لازم توافق على إذن الإشعارات من المتصفح");

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON();

  // لو نفس الجهاز ده كان مسجل قبل كده بحساب تاني، امسح القديم الأول
  await supabase.from("push_subscriptions").delete().eq("endpoint", json.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
  });
  if (error) throw error;
  return sub;
}

export async function unsubscribeFromPush() {
  const sub = await getPushSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
