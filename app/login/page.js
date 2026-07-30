"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, MapPin, Lock, Building2, Info, MessageCircle, Home, LogIn, Mail, Clock, Briefcase, Wrench } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { defaultRouteForRole, DEFAULT_PUBLIC_PAGE } from "../../lib/constants";

const TABS = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "services", label: "خدمات مكتبنا", icon: Wrench },
  { key: "company-types", label: "أنواع الشركات", icon: Building2 },
  { key: "about", label: "عن المكتب", icon: Info },
  { key: "contact", label: "تواصل معنا", icon: MessageCircle },
  { key: "login", label: "تسجيل الدخول", icon: LogIn },
];

function OfficeLogo({ logo, size = "w-16 h-16" }) {
  const [error, setError] = useState(false);
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt="شعار المكتب" className={`${size} rounded-2xl object-contain bg-white shadow-lg p-1`} />;
  }
  if (error) {
    return <div className={`${size} rounded-2xl bg-gold flex items-center justify-center text-navyDark font-black text-2xl shadow-lg`}>مح</div>;
  }
  // بديل احتياطي: لو حطيت ملف اسمه logo.png داخل مجلد public هيظهر تلقائيًا من غير ما ترفع صورة من الإعدادات
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="شعار المكتب" onError={() => setError(true)}
      className={`${size} rounded-2xl object-contain bg-white shadow-lg p-1`} />
  );
}

function LoginForm() {
  const { login, profile, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && profile) router.replace(defaultRouteForRole(profile.role)); }, [loading, profile, router]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { setErr("اكتب الإيميل"); return; }
    setBusy(true);
    const finalEmail = email.includes("@") ? email : `${email}@mostafa-hamza.office`;
    const { error } = await login(finalEmail, password);
    if (error) { setBusy(false); setErr(error); return; }
    // التوجيه بيحصل من الـ useEffect فوق بعد ما الملف الشخصي (ودوره) يتحمّل فعليًا
  };

  return (
    <div className="max-w-sm mx-auto py-10">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col items-center gap-2 mb-5 text-navy dark:text-slate-200">
          <div className="w-10 h-10 rounded-full bg-navy/10 dark:bg-slate-700 flex items-center justify-center">
            <Lock size={18} className="text-navy dark:text-gold" />
          </div>
          <span className="text-sm font-bold">دخول الموظفين</span>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} required placeholder="الإيميل"
            className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy" dir="ltr" />
          <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} required placeholder="كلمة المرور"
            className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-navy" />
          {err && <div className="text-xs text-rose-600">{err}</div>}
          <button type="submit" disabled={busy}
            className="text-sm font-medium bg-navy hover:bg-navyDark text-white rounded-lg py-2.5 disabled:opacity-50 transition-colors">
            {busy ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [officeInfo, setOfficeInfo] = useState(null);
  const [pageContent, setPageContent] = useState(DEFAULT_PUBLIC_PAGE);
  const [tab, setTab] = useState("home");

  useEffect(() => {
    supabase.from("settings").select("office_info, public_page").eq("id", 1).single()
      .then(({ data }) => {
        if (data?.office_info) setOfficeInfo(data.office_info);
        if (data?.public_page) setPageContent({ ...DEFAULT_PUBLIC_PAGE, ...data.public_page });
      });
  }, []);

  const officeName = officeInfo?.name || "مكتب المحاسب القانوني / مصطفى حمزة";
  const pp = pageContent;
  const companyTypes = pp.company_types?.length ? pp.company_types : DEFAULT_PUBLIC_PAGE.company_types;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-navyDark via-navy to-[#0a1f33]">
      {/* شريط علوي بالتبويبات */}
      <header className="sticky top-0 z-30 bg-navyDark/90 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <OfficeLogo logo={officeInfo?.logo} size="w-9 h-9" />
              <span className="text-white font-bold text-sm hidden sm:block">{officeName}</span>
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto pb-2 -mb-px scrollbar-none">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2
                  ${tab === key
                    ? "text-gold border-gold bg-white/5"
                    : "text-slate-300 border-transparent hover:text-white hover:bg-white/5"}`}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14 text-slate-200">
        {tab === "home" && (
          <div>
            <div className="flex items-center gap-3 mb-8">
              <OfficeLogo logo={officeInfo?.logo} />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{officeName}</h1>
                <p className="text-slate-400 text-sm">محاسبة · مراجعة · استشارات ضريبية</p>
              </div>
            </div>
            <div className="text-sm md:text-base leading-7 md:leading-8 space-y-4 text-slate-300">
              <p>{pp.home_intro_1}</p>
              <p>{pp.home_intro_2}</p>
              <div className="grid sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Briefcase className="mx-auto mb-2 text-gold" size={22} />
                  <p className="text-xs text-slate-300">محاسبة ومراجعة</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Building2 className="mx-auto mb-2 text-gold" size={22} />
                  <p className="text-xs text-slate-300">تأسيس الشركات</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <Info className="mx-auto mb-2 text-gold" size={22} />
                  <p className="text-xs text-slate-300">استشارات ضريبية</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "services" && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">خدمات مكتبنا</h2>
            <p className="text-slate-400 text-sm mb-6">الخدمات اللي بنقدمها لعملائنا.</p>
            {pp.services?.length ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {pp.services.map((s, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-gold font-bold mb-1.5 text-sm">{s.title}</h3>
                    <p className="text-slate-300 text-xs leading-6">{s.desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">بيانات الخدمات هتظهر هنا أول ما يتم إضافتها من صفحة الإعدادات.</p>
            )}
          </div>
        )}

        {tab === "company-types" && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">أنواع الشركات</h2>
            <p className="text-slate-400 text-sm mb-6">نظرة سريعة على الأشكال القانونية الأكثر شيوعًا لتأسيس الشركات في مصر.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {companyTypes.map((c) => (
                <div key={c.name} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-gold font-bold mb-1.5 text-sm">{c.name}</h3>
                  <p className="text-slate-300 text-xs leading-6">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className="text-sm md:text-base leading-7 md:leading-8 space-y-4 text-slate-300">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">عن المكتب</h2>
            <p>{pp.about_intro}</p>
            <div>
              <h3 className="text-gold font-bold mb-1">هدفنا الرئيسي</h3>
              <p>{pp.about_goal}</p>
            </div>
            <div>
              <h3 className="text-gold font-bold mb-1">رسالتنا</h3>
              <p>{pp.about_message}</p>
            </div>
            <div>
              <h3 className="text-gold font-bold mb-1">رؤيتنا</h3>
              <p>{pp.about_vision}</p>
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">تواصل معنا</h2>
            <p className="text-slate-400 text-sm mb-6">يسعدنا تواصلك معنا لأي استفسار أو طلب خدمة.</p>
            <div className="flex flex-col gap-3">
              {officeInfo?.phone && (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <Phone size={18} className="text-gold shrink-0" />
                  <span className="text-slate-200 text-sm">{officeInfo.phone}</span>
                </div>
              )}
              {officeInfo?.address && (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <MapPin size={18} className="text-gold shrink-0" />
                  <span className="text-slate-200 text-sm">{officeInfo.address}</span>
                </div>
              )}
              {(officeInfo?.email || pp.contact_email) && (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <Mail size={18} className="text-gold shrink-0" />
                  <span className="text-slate-200 text-sm" dir="ltr">{officeInfo?.email || pp.contact_email}</span>
                </div>
              )}
              {pp.contact_hours && (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <Clock size={18} className="text-gold shrink-0" />
                  <span className="text-slate-200 text-sm">{pp.contact_hours}</span>
                </div>
              )}
              {!officeInfo?.phone && !officeInfo?.address && !officeInfo?.email && !pp.contact_email && (
                <p className="text-slate-400 text-sm">بيانات التواصل هتظهر هنا أول ما يتم إضافتها من صفحة الإعدادات.</p>
              )}
            </div>
          </div>
        )}

        {tab === "login" && <LoginForm />}
      </div>
    </div>
  );
}
