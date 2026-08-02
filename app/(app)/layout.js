"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Wallet, BarChart3, ClipboardCheck, ListTodo, CalendarDays,
  Settings as SettingsIcon, Sun, Moon, LogOut, Menu, HandCoins, Bell, BellOff, Building2,
} from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { DataProvider, useData } from "../../lib/DataContext";
import { TABS_FULL, defaultRouteForRole } from "../../lib/constants";
import { buildReminders } from "../../lib/helpers";
import { isPushSupported, getPushSubscription, subscribeToPush, unsubscribeFromPush } from "../../lib/pushClient";
import NotificationBell from "../../components/NotificationBell";

const ICONS = {
  dashboard: LayoutDashboard, clients: Users, invoices: FileText, expenses: Wallet,
  reports: BarChart3, declarations: ClipboardCheck, tasks: ListTodo, leaves: CalendarDays, custody: HandCoins,
  "company-leads": Building2, settings: SettingsIcon,
};

function Shell({ children }) {
  const { profile, logout } = useAuth();
  const data = useData();
  const router = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState("checking"); // checking | unsupported | subscribed | not-subscribed
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!isPushSupported()) { setPushStatus("unsupported"); return; }
    getPushSubscription().then((sub) => setPushStatus(sub ? "subscribed" : "not-subscribed")).catch(() => setPushStatus("not-subscribed"));
  }, []);

  const togglePush = async () => {
    if (!profile || pushBusy) return;
    setPushBusy(true);
    try {
      if (pushStatus === "subscribed") {
        await unsubscribeFromPush();
        setPushStatus("not-subscribed");
      } else {
        await subscribeToPush(profile.id);
        setPushStatus("subscribed");
      }
    } catch (e) {
      alert(e.message || "حصل خطأ في تفعيل الإشعارات");
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    const currentKey = pathname.split("/")[1] || "dashboard";
    const tab = TABS_FULL.find((t) => t.key === currentKey);
    if (tab && !tab.roles.includes(profile.role)) router.replace(defaultRouteForRole(profile.role));
  }, [profile, pathname, router]);

  if (!profile) return null;

  const tabs = TABS_FULL.filter((t) => t.roles.includes(profile.role));
  const activeKey = pathname.split("/")[1] || "dashboard";
  const reminders = useMemo(() => (data?.clients ? buildReminders(data.clients) : []), [data?.clients]);
  // data.tasks بالنسبة للمحاسب/المتدرب أصلاً مقصورة بصلاحيات قاعدة البيانات على مهامه هو بس (المرسلة له أو منه)
  const tasksBadge = data?.tasks ? data.tasks.filter((t) => t.status !== "معتمد التنفيذ").length : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <aside className={`no-print fixed md:sticky top-0 z-40 h-screen w-64 bg-navyDark text-white flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center font-black text-navyDark">مح</div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">مكتب الأستاذ مصطفى حمزة</div>
              <div className="text-xs text-slate-300">{profile.display_name} · {profile.role}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 px-3">
          {tabs.map((t) => {
            const Icon = ICONS[t.key];
            const badge = t.key === "tasks" ? tasksBadge : t.key === "clients" ? reminders.length : 0;
            const active = activeKey === t.key;
            return (
              <button key={t.key} onClick={() => { router.push(`/${t.key}`); setSidebarOpen(false); }}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-gold text-navyDark" : "text-slate-200 hover:bg-white/10"}`}>
                <Icon size={17} /> {t.label}
                {badge > 0 && <span className="mr-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 flex flex-col gap-1">
          {pushStatus !== "unsupported" && (
            <button onClick={togglePush} disabled={pushBusy} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50">
              {pushStatus === "subscribed" ? <BellOff size={17} /> : <Bell size={17} />}
              {pushBusy ? "جاري التحديث..." : pushStatus === "subscribed" ? "إيقاف الإشعارات" : "فعّل الإشعارات"}
            </button>
          )}
          <button onClick={() => setDark((d) => !d)} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-white/10">
            {dark ? <Sun size={17} /> : <Moon size={17} />} {dark ? "الوضع الفاتح" : "الوضع الداكن"}
          </button>
          <button onClick={async () => { await logout(); router.replace("/login"); }} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-rose-300 hover:bg-white/10">
            <LogOut size={17} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 md:hidden"><Menu size={20} /></button>
          <span className="font-bold text-sm md:hidden">مكتب الأستاذ مصطفى حمزة</span>
          <div className="flex-1 hidden md:block" />
          <div className="[&_button]:text-slate-700 dark:[&_button]:text-slate-200 [&_button:hover]:bg-slate-100 dark:[&_button:hover]:bg-white/10">
            <NotificationBell userId={profile?.id} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {data?.error && <div className="mb-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 text-sm px-3 py-2 rounded-lg">{data.error}</div>}
          {data?.loading ? <div className="text-center py-16 text-slate-400">جاري تحميل البيانات...</div> : children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!loading && !profile) router.replace("/login"); }, [loading, profile, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">جاري التحميل...</div>;
  if (!profile) return null;

  return (
    <DataProvider>
      <Shell>{children}</Shell>
    </DataProvider>
  );
}
