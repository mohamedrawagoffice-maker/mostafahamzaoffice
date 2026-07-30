/**
 * سكريبت لمرة واحدة لإنشاء المستخدمين الثمانية في Supabase Auth + جدول profiles.
 *
 * طريقة الاستخدام:
 * 1) انسخ .env.local.example باسم .env.local واملأ فيه:
 *    NEXT_PUBLIC_SUPABASE_URL
 *    SUPABASE_SERVICE_ROLE_KEY   (من Supabase Dashboard > Project Settings > API > service_role)
 * 2) شغّل: npm run seed-users
 * 3) غيّر كلمات المرور المبدئية بعد أول تسجيل دخول (من Supabase Dashboard أو من داخل التطبيق لاحقًا)
 *
 * تحذير: SUPABASE_SERVICE_ROLE_KEY مفتاح خطير جدًا — لا تضعه في Vercel ولا في أي كود عميل،
 * استخدمه فقط محليًا لتشغيل هذا السكريبت مرة واحدة.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("لازم تحط NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local أولاً");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

// غيّر كلمات المرور دي لحاجة أقوى قبل أو بعد التشغيل مباشرة
const USERS = [
  { username: "mostafa", name: "أ/مصطفى حمزة", role: "مدير", password: "mostafa2026" },
  { username: "mohamed", name: "أ/ محمد رواج", role: "أدمن", password: "mohamed2026" },
  { username: "yomna", name: "أ/ يمنى الكفراوي", role: "محاسب", password: "yomna2026" },
  { username: "manar", name: "أ/ منار يحيى", role: "محاسب", password: "manar2026" },
  { username: "nada", name: "أ/ ندى الزهار", role: "محاسب", password: "nada2026" },
  { username: "noran", name: "أ/ نوران نادر", role: "محاسب", password: "noran2026" },
  { username: "mariam", name: "أ/ مريم العربي", role: "محاسب", password: "mariam2026" },
  { username: "trainee", name: "أ/ متدرب", role: "متدرب", password: "trainee2026" },
];

const usernameToEmail = (u) => `${u}@mostafa-hamza.office`;

(async () => {
  for (const u of USERS) {
    const email = usernameToEmail(u.username);
    const { data, error } = await admin.auth.admin.createUser({
      email, password: u.password, email_confirm: true,
    });
    if (error) {
      console.error(`فشل إنشاء ${u.name}:`, error.message);
      continue;
    }
    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id, username: u.username, display_name: u.name, role: u.role,
    });
    if (profileError) console.error(`فشل إنشاء بروفايل ${u.name}:`, profileError.message);
    else console.log(`تم إنشاء ${u.name} (${u.username}) بنجاح`);
  }
  console.log("انتهى. غيّر كلمات المرور من Supabase Dashboard > Authentication > Users.");
})();
