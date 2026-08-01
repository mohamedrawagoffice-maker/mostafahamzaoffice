import { createClient } from "@supabase/supabase-js";
import { notifyUsers } from "../../../lib/serverNotify";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const { userIds, title, body, url } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0 || !title) {
      return Response.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    await notifyUsers(supabaseAdmin, userIds, title, body, url);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("notify route error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
