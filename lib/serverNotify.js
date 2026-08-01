import webpush from "web-push";
import nodemailer from "nodemailer";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:office@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// اتصال واحد بس بحساب Gmail، بيتعاد استخدامه لكل الإيميلات (بدل ما نفتح اتصال جديد كل مرة)
let mailTransport = null;
function getMailTransport() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
  if (!mailTransport) {
    mailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return mailTransport;
}

async function sendEmail(to, subject, bodyText) {
  const transport = getMailTransport();
  if (!transport || !to) return;
  try {
    await transport.sendMail({
      from: `"مكتب الأستاذ مصطفى حمزة" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: `<div style="font-family:Tahoma,sans-serif;direction:rtl;text-align:right;padding:16px">
        <h3 style="margin:0 0 8px">${subject}</h3>
        <p style="color:#333;white-space:pre-line">${bodyText || ""}</p>
      </div>`,
    });
  } catch (e) {
    console.error("gmail smtp send failed:", e.message);
  }
}

async function sendPushToUser(supabaseAdmin, userId, title, body, url) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs || subs.length === 0) return;
  const payload = JSON.stringify({ title, body, url });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id); // اشتراك ملغي/منتهي، امسحه
        } else {
          console.error("push send failed:", e.message);
        }
      }
    })
  );
}

// بيبعت إيميل + Push لمجموعة مستخدمين بالـ id بتاعهم، مباشرة من السيرفر (بدون الحاجة لجلسة مستخدم)
export async function notifyUsers(supabaseAdmin, userIds, title, body, url) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) return;
  const { data: profiles } = await supabaseAdmin.from("profiles").select("id, notify_email").in("id", ids);
  await Promise.all(
    (profiles || []).flatMap((p) => [
      sendEmail(p.notify_email, title, body || ""),
      sendPushToUser(supabaseAdmin, p.id, title, body || "", url || "/dashboard"),
    ])
  );
}
