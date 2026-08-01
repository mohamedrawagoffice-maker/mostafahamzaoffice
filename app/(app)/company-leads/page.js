"use client";
import { useState, useEffect } from "react";
import { Building2, Phone, MapPin, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { Card, Badge } from "../../../components/ui";
import { fmtDate } from "../../../lib/helpers";

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

export default function CompanyLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("company_wizard_leads").select("*").order("created_at", { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    await supabase.from("company_wizard_leads").delete().eq("id", id);
    setLeads((p) => p.filter((l) => l.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">طلبات تأسيس الشركات</h2>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-navy dark:text-[#e3c65a] hover:underline">
          <RefreshCw size={14} /> تحديث
        </button>
      </div>
      <p className="text-xs text-slate-400 -mt-3">
        كل شخص سأل "مساعد ترشيح نوع الشركة" في صفحة تسجيل الدخول العامة، مع البيانات اللي كتبها والاختيارات اللي عملها والوقت اللي سأل فيه.
      </p>

      {loading ? (
        <p className="text-center text-slate-400 py-8">جاري التحميل...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Building2 size={15} className="text-gold" />
                    <span className="font-bold text-slate-800 dark:text-slate-100">{l.company_name || "بدون اسم"}</span>
                    {l.recommended_type && <Badge color="green">{l.recommended_type}</Badge>}
                    <span className="text-xs text-slate-400">{fmtDateTime(l.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {l.activity && <span>النشاط: {l.activity}</span>}
                    {l.governorate && <span className="flex items-center gap-1"><MapPin size={12} /> {l.governorate}</span>}
                    {l.phone && <span className="flex items-center gap-1" dir="ltr"><Phone size={12} /> {l.phone}</span>}
                  </div>
                  {l.answers_summary && (
                    <div className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300 flex flex-col gap-1">
                      {l.answers_summary.split("\n").map((line, idx) => {
                        const [q, ...rest] = line.split(":");
                        const a = rest.join(":").trim();
                        return (
                          <div key={idx} className="flex flex-wrap gap-1">
                            <span className="text-slate-400">{q}:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{a}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => remove(l.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg shrink-0" title="حذف">
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
          {leads.length === 0 && <p className="text-center text-slate-400 py-8">لسه مفيش حد سأل عن تأسيس شركة</p>}
        </div>
      )}
    </div>
  );
}
