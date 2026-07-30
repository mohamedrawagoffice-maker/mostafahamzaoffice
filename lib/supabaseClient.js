import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("متغيرات NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY غير موجودة. أضفها في .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// المستخدمون الثمانية يسجلون بـ "اسم المستخدم" فقط، ونربطه بإيميل وهمي
// لأن Supabase Auth يتطلب إيميل. الدومين هنا رمزي وغير مُرسل فعليًا.
export const usernameToEmail = (username) => `${username}@mostafa-hamza.office`;
