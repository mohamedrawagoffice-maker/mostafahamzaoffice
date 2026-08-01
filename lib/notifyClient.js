import { supabase } from "./supabaseClient";

// بيبعت طلب للسيرفر عشان يرسل إشعار (إيميل + Push) لمجموعة مستخدمين محددين بالـ id بتاعهم
// fire-and-forget: مبيمنعش أو يبطّئ العملية الأساسية لو فشل
export async function sendNotification({ userIds, title, body, url }) {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (ids.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userIds: ids, title, body, url }),
    });
  } catch (e) {
    console.error("sendNotification failed:", e);
  }
}
