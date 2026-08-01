import { supabase } from "./supabaseClient";

// بيبعت طلب للسيرفر عشان يرسل إشعار (إيميل + Push) لمجموعة مستخدمين محددين بالـ id بتاعهم،
// وكمان بيسجل إشعار جوه الموقع نفسه (يوصل لحظيًا عن طريق Realtime من غير ما تحدّث الصفحة)
// fire-and-forget: مبيمنعش أو يبطّئ العملية الأساسية لو فشل
export async function sendNotification({ userIds, title, body, url }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return;

  // إشعار داخل الموقع (لحظي)
  supabase.from("notifications").insert(ids.map((user_id) => ({ user_id, title, body: body || "", url: url || "/dashboard" })))
    .then(({ error }) => { if (error) console.error("in-app notification failed:", error.message); });

  // إيميل + Push (عن طريق السيرفر)
  try {
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
