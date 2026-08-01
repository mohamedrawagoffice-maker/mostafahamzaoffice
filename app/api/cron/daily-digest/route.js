import { createClient } from "@supabase/supabase-js";
import { notifyUsers } from "../../../../lib/serverNotify";
import { buildReminders, generateAllDeclarations, daysBetween, todayISO } from "../../../../lib/helpers";

// بيتعمل جوه الدالة نفسها بدل المستوى الأعلى للملف، عشان مياخدش الموقع كله وقت البناء (build)
// لو متغيرات البيئة لسه مش متظبطة في Vercel
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// بيتنادى مرة كل يوم (عن طريق Vercel Cron) وبيبعت ملخص واحد للمدير/الأدمن
// فيه: تواريخ هامة للعملاء قربت/اتأخرت، ومبالغ إقرارات مستحقة قربت/اتأخرت
export async function GET(req) {
  const auth = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return Response.json({ error: "الإشعارات مش متظبطة بعد (متغيرات البيئة ناقصة)" }, { status: 503 });

  try {
    const [{ data: clients }, { data: declarationStatusRows }, { data: managers }] = await Promise.all([
      supabaseAdmin.from("clients").select("*"),
      supabaseAdmin.from("declaration_status").select("*"),
      supabaseAdmin.from("profiles").select("id, role").in("role", ["مدير", "أدمن"]),
    ]);

    const declarationStatus = {};
    (declarationStatusRows || []).forEach((r) => { declarationStatus[r.key] = r; });

    const reminders = buildReminders(clients || []); // بالفعل بترجع بس اللي قرب موعده (14 يوم) أو اتأخر
    const allDeclarations = generateAllDeclarations(clients || [], declarationStatus);
    const today = todayISO();
    const dueDeclarations = allDeclarations.filter((d) =>
      d.status === "متأخر" || (d.status === "قيد الانتظار" && daysBetween(today, d.deadline) <= 14)
    );

    if (reminders.length === 0 && dueDeclarations.length === 0) {
      return Response.json({ ok: true, sent: false, reason: "لا يوجد تنبيهات اليوم" });
    }

    const lines = [];
    if (reminders.length > 0) {
      lines.push("تواريخ هامة:");
      reminders.slice(0, 20).forEach((r) => lines.push(`- ${r.clientName}: ${r.type} (${r.diff < 0 ? `متأخر ${Math.abs(r.diff)} يوم` : `باقي ${r.diff} يوم`})`));
    }
    if (dueDeclarations.length > 0) {
      lines.push("", "إقرارات مستحقة:");
      dueDeclarations.slice(0, 20).forEach((d) => lines.push(`- ${d.clientName}: ${d.type} (${d.period}) — ${d.status}`));
    }

    const managerIds = (managers || []).map((m) => m.id);
    await notifyUsers(supabaseAdmin, managerIds, "ملخص التنبيهات اليومي", lines.join("\n"), "/clients");

    return Response.json({ ok: true, sent: true, remindersCount: reminders.length, declarationsCount: dueDeclarations.length });
  } catch (e) {
    console.error("daily digest cron error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
