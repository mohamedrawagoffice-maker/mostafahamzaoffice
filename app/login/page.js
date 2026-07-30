"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Phone, MapPin, Lock, Building2, Info, MessageCircle, Home, LogIn, Mail, Clock, Briefcase, Wrench,
  Sparkles, ArrowLeft, ArrowRight, RotateCcw, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { defaultRouteForRole, DEFAULT_PUBLIC_PAGE, EGYPT_GOVERNORATES } from "../../lib/constants";

const TABS = [
  { key: "home", label: "الرئيسية", icon: Home },
  { key: "services", label: "خدمات مكتبنا", icon: Wrench },
  { key: "company-types", label: "تأسيس الشركات", icon: Building2 },
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

// أهم الاشتراطات القانونية الحالية لكل نوع (قانون الشركات 159 لسنة 1981 وتعديلاته، وقانون السجل التجاري)
const LEGAL_NOTES = {
  "منشأة فردية": "مش شركة من الناحية القانونية، بل نشاط فردي يُسجَّل بالسجل التجاري باسم صاحبه. مسؤوليته غير محدودة (بكل أمواله الشخصية)، ومفيش حد أدنى لرأس المال.",
  "شركة تضامن": "حد أدنى شريكين، ومفيش حد أقصى. كل الشركاء المتضامنين مسؤولين بالتضامن وبكل أموالهم الشخصية عن ديون الشركة.",
  "شركة توصية بسيطة": "حد أدنى شريكين: شريك متضامن واحد على الأقل (مسؤوليته كاملة وغير محدودة) وشريك موصٍ واحد على الأقل (مسؤوليته بقدر حصته، ولا يشارك في الإدارة).",
  "شركة ذات مسئولية محدودة": "من 2 إلى 50 شريكًا. مسؤولية كل شريك محدودة بقدر حصته في رأس المال، ومفيش حد أدنى عام لرأس المال (إلا لو النشاط نفسه بيستلزم رأس مال معين).",
  "شركة الشخص الواحد": "شخص واحد بس (طبيعي أو اعتباري)، ومسؤوليته محدودة برأس مال الشركة. في أنشطة معينة (زي البنوك والتأمين) ممنوع تأسيسها بهذا الشكل.",
  "شركة مساهمة": "حد أدنى 3 مؤسسين/مساهمين على الأقل، ومفيش حد أقصى. حد أدنى لرأس المال المُصدَر حوالي 250,000 جنيه (وبيزيد لو هيتم الطرح للاكتتاب العام).",
  "فرع شركة أجنبية": "التسجيل بيتم عن طريق الهيئة العامة للاستثمار والمناطق الحرة (GAFI)، ولازم يكون في عقد أو نشاط فعلي للشركة الأم في مصر.",
};

// خيار زر إجابة (نعم/لا أو اختيار من عدة بدائل) داخل معالج ترشيح نوع الشركة
function WizardChoice({ options, onPick }) {
  return (
    <div className="flex flex-col gap-2 mt-4">
      {options.map((o) => (
        <button key={o.label} onClick={() => onPick(o.value)}
          className="text-right bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold/60 rounded-xl px-4 py-3 text-sm text-slate-200 transition-colors">
          {o.label}
          {o.hint && <span className="block text-xs text-slate-400 mt-0.5">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

// معالج بيسأل أسئلة بسيطة عن الشركة اللي عايز تؤسسها، وبيرشح نوع الشركة القانوني الأنسب بناءً على الإجابات
function CompanyTypeWizard({ companyTypes }) {
  const emptyAnswers = { companyName: "", activity: "", governorate: "", phone: "" };
  const [step, setStep] = useState(0); // 0 = بيانات أساسية، 1..n = أسئلة الترشيح
  const [info, setInfo] = useState(emptyAnswers);
  const [result, setResult] = useState(null);

  const restart = () => { setStep(0); setInfo(emptyAnswers); setResult(null); };

  const finish = (typeName) => setResult(typeName);

  if (result) {
    const typeInfo = companyTypes.find((c) => c.name === result);
    return (
      <div className="bg-white/5 border border-gold/30 rounded-xl p-5">
        <div className="flex items-center gap-2 text-gold mb-2">
          <CheckCircle2 size={18} />
          <span className="font-bold text-sm">الشكل القانوني المقترح لشركتك</span>
        </div>
        <h3 className="text-white font-black text-lg mb-2">{result}</h3>
        {typeInfo?.desc && <p className="text-slate-300 text-sm leading-6 mb-3">{typeInfo.desc}</p>}
        {LEGAL_NOTES[result] && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-xs text-amber-200 leading-6">
            <span className="font-bold block mb-0.5">الاشتراط القانوني الحالي:</span>
            {LEGAL_NOTES[result]}
          </div>
        )}
        {(info.companyName || info.activity || info.governorate) && (
          <div className="bg-white/5 rounded-lg p-3 mb-4 text-xs text-slate-400 flex flex-col gap-1">
            {info.companyName && <span>اسم الشركة المقترح: <span className="text-slate-200">{info.companyName}</span></span>}
            {info.activity && <span>النشاط: <span className="text-slate-200">{info.activity}</span></span>}
            {info.governorate && <span>المحافظة: <span className="text-slate-200">{info.governorate}</span></span>}
          </div>
        )}
        <p className="text-slate-400 text-xs leading-6 mb-4">
          الترشيح ده استرشادي بناءً على إجاباتك، والتفاصيل والإجراءات النهائية بتتحدد بعد استشارة مباشرة مع المكتب.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={restart} className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg px-3.5 py-2">
            <RotateCcw size={13} /> إعادة الأسئلة
          </button>
        </div>
      </div>
    );
  }

  // خطوة 0: بيانات أساسية عن الشركة المطلوب تأسيسها (اختيارية، لغرض المتابعة معاك)
  if (step === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 text-gold mb-1">
          <Sparkles size={18} />
          <span className="font-bold text-sm">مساعد ترشيح نوع الشركة</span>
        </div>
        <p className="text-slate-400 text-xs mb-4">جاوب على كام سؤال بسيط ونرشحلك الشكل القانوني الأنسب لشركتك.</p>
        <div className="flex flex-col gap-3">
          <input value={info.companyName} onChange={(e) => setInfo({ ...info, companyName: e.target.value })}
            placeholder="اسم الشركة المقترح (اختياري)"
            className="text-sm px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold" />
          <input value={info.activity} onChange={(e) => setInfo({ ...info, activity: e.target.value })}
            placeholder="نشاط الشركة (مثال: تجارة، مقاولات، برمجيات...)"
            className="text-sm px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold" />
          <select value={info.governorate} onChange={(e) => setInfo({ ...info, governorate: e.target.value })}
            className="text-sm px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-gold">
            <option value="" className="text-slate-800">المحافظة (اختياري)</option>
            {EGYPT_GOVERNORATES.map((g) => <option key={g} value={g} className="text-slate-800">{g}</option>)}
          </select>
          <input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })}
            placeholder="رقم للتواصل معاك (اختياري)" dir="ltr"
            className="text-sm px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold" />
          <button onClick={() => setStep(1)}
            className="flex items-center justify-center gap-1.5 text-sm font-medium bg-gold hover:brightness-90 text-navyDark rounded-lg py-2.5 mt-1">
            ابدأ الأسئلة <ArrowLeft size={15} />
          </button>
        </div>
      </div>
    );
  }

  // خطوة 1: فرع لشركة أجنبية؟
  if (step === 1) {
    return (
      <WizardStep title="هل الشركة دي فرع لشركة أم مسجّلة برّه مصر؟" step={step} onBack={() => setStep(0)}>
        <WizardChoice
          options={[
            { label: "نعم، فرع لشركة أجنبية", value: true },
            { label: "لا، شركة جديدة بالكامل داخل مصر", value: false },
          ]}
          onPick={(v) => (v ? finish("فرع شركة أجنبية") : setStep(2))}
        />
      </WizardStep>
    );
  }

  // خطوة 2: عدد الشركاء
  if (step === 2) {
    return (
      <WizardStep title="كام شخص هيشارك في ملكية الشركة (المؤسس/الشركاء)؟" step={step} onBack={() => setStep(1)}>
        <WizardChoice
          options={[
            { label: "شخص واحد فقط", value: "one" },
            { label: "من 2 إلى 50 شريك", value: "few" },
            { label: "أكثر من 50، أو عايز أطرح أسهم الشركة للجمهور مستقبلًا", value: "many" },
          ]}
          onPick={(v) => {
            if (v === "many") finish("شركة مساهمة");
            else if (v === "one") setStep(3);
            else setStep(4);
          }}
        />
      </WizardStep>
    );
  }

  // خطوة 3 (شخص واحد): مسؤولية محدودة؟
  if (step === 3) {
    return (
      <WizardStep title="عايز مسؤوليتك المالية تكون محدودة برأس مال الشركة بس (متضمنش أموالك الشخصية)؟" step={step} onBack={() => setStep(2)}>
        <WizardChoice
          options={[
            { label: "نعم، عايز أحمي أموالي الشخصية", value: true },
            { label: "لا، مش فارق معايا", value: false },
          ]}
          onPick={(v) => finish(v ? "شركة الشخص الواحد" : "منشأة فردية")}
        />
      </WizardStep>
    );
  }

  // خطوة 4 (شركاء): طرح أسهم؟
  if (step === 4) {
    return (
      <WizardStep title="عايزين شكل يسهّل بيع/تداول حصص الشركة كأسهم؟" step={step} onBack={() => setStep(2)}>
        <WizardChoice
          options={[
            { label: "نعم", value: true },
            { label: "لا", value: false },
          ]}
          onPick={(v) => (v ? finish("شركة مساهمة") : setStep(5))}
        />
      </WizardStep>
    );
  }

  // خطوة 5 (شركاء): مسؤولية محدودة؟
  if (step === 5) {
    return (
      <WizardStep title="عايزين مسؤولية كل شريك تكون محدودة بقدر حصته في رأس المال بس؟" step={step} onBack={() => setStep(4)}>
        <WizardChoice
          options={[
            { label: "نعم", value: true },
            { label: "لا، مش شرط", value: false },
          ]}
          onPick={(v) => (v ? finish("شركة ذات مسئولية محدودة") : setStep(6))}
        />
      </WizardStep>
    );
  }

  // خطوة 6 (شركاء): يوجد شريك موصٍ (بيشارك بالمال بس مش هيدير)؟
  if (step === 6) {
    return (
      <WizardStep title="في حد من الشركاء هيشارك بالمال بس مش هيشارك في إدارة الشركة؟" step={step} onBack={() => setStep(5)}>
        <WizardChoice
          options={[
            { label: "نعم", value: true },
            { label: "لا، كل الشركاء هيديروا الشركة سوا", value: false },
          ]}
          onPick={(v) => finish(v ? "شركة توصية بسيطة" : "شركة تضامن")}
        />
      </WizardStep>
    );
  }

  return null;
}

function WizardStep({ title, onBack, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-3">
        <ArrowRight size={13} /> رجوع
      </button>
      <h3 className="text-white font-bold text-sm leading-6">{title}</h3>
      {children}
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
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">تأسيس الشركات</h2>
            <p className="text-slate-400 text-sm mb-6">جاوب على كام سؤال بسيط ونرشحلك الشكل القانوني الأنسب لشركتك، أو تصفح الأشكال القانونية الأكثر شيوعًا لتأسيس الشركات في مصر.</p>

            <div className="mb-8">
              <CompanyTypeWizard companyTypes={companyTypes} />
            </div>

            <h3 className="text-white font-bold text-sm mb-3">كل الأشكال القانونية</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {companyTypes.map((c) => (
                <div key={c.name} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-gold font-bold mb-1.5 text-sm">{c.name}</h3>
                  <p className="text-slate-300 text-xs leading-6">{c.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="text-gold font-bold text-sm mb-1">حوافز وضمانات قانون الاستثمار رقم 72 لسنة 2017</h3>
              <p className="text-slate-400 text-xs leading-6 mb-4">
                قانون منفصل عن قانون الشركات، بيحكم حوافز وضمانات الاستثمار (بغض النظر عن الشكل القانوني اللي هتختاره)، وآخر تعديل جوهري عليه كان بالقانون رقم 160 لسنة 2023.
              </p>
              <ul className="text-slate-300 text-xs leading-6 space-y-2 list-disc pr-4">
                <li>الشباك الواحد: كل التراخيص والموافقات اللازمة للمشروع بتصدر من الهيئة العامة للاستثمار والمناطق الحرة (GAFI) خلال مدد قانونية محددة، من غير الرجوع لجهات متفرقة.</li>
                <li>خصم استثماري من صافي الأرباح الخاضعة للضريبة، بنسب تختلف حسب المنطقة الجغرافية للمشروع ونوع النشاط طبقًا للخريطة الاستثمارية.</li>
                <li>حافز نقدي إضافي (من 35% إلى 55% من قيمة الضريبة المسددة) لبعض الأنشطة الصناعية المحددة بعد تعديل 2023.</li>
                <li>حوافز غير ضريبية: تحمل الدولة تكلفة توصيل المرافق للمشروع، ودعم جزء من تكلفة التدريب الفني للعاملين، ورد نصف قيمة الأرض الصناعية لو بدأ الإنتاج خلال سنتين من الاستلام.</li>
                <li>ضمانات عامة: عدم تأميم أو مصادرة الأموال المستثمرة إلا بحكم قضائي، وحرية تحويل الأرباح ورأس المال للخارج.</li>
              </ul>
              <p className="text-slate-500 text-[11px] leading-6 mt-4">
                الاستفادة الفعلية من الحوافز دي بتتوقف على نوع النشاط ومكان المشروع وشروط تانية باللائحة التنفيذية — استشرنا في مكتبنا لمعرفة اللي ينطبق على حالتك بالظبط.
              </p>
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
