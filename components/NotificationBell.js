"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function NotificationBell({ userId }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => { if (active && data) setItems(data); });

    // اشتراك لحظي: أي إشعار جديد ليّ بيوصل فورًا من غير أي تحديث للصفحة
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((p) => [payload.new, ...p]))
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    const onClickOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      supabase.from("notifications").update({ read: true }).eq("id", n.id).then(() => {});
    }
    router.push(n.url || "/dashboard");
  };

  const markAllRead = () => {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((p) => p.map((x) => ({ ...x, read: true })));
    supabase.from("notifications").update({ read: true }).in("id", unreadIds).then(() => {});
  };

  const timeAgo = (iso) => {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} د`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `منذ ${diffH} س`;
    return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-200 hover:bg-white/10" title="الإشعارات">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">الإشعارات</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-navy dark:text-[#e3c65a] hover:underline">تعليم الكل كمقروء</button>}
          </div>
          {items.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">لا يوجد إشعارات</p>
          ) : (
            items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)}
                className={`w-full text-right px-3.5 py-2.5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 ${!n.read ? "bg-gold/5" : ""}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
