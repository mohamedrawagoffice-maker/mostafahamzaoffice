"use client";
import { useState, useMemo } from "react";
import { Plus, Trash2, CalendarDays, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Input, TextArea, Select, Badge, Modal } from "../../../components/ui";
import { fmtDate, todayISO } from "../../../lib/helpers";
import { LEAVE_ANNUAL_PAID_DAYS } from "../../../lib/constants";

function LeaveNote({ leave, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(leave.note || "");

  if (!canEdit) {
    return leave.note ? <p className="text-xs text-slate-500 mt-1">{leave.note}</p> : null;
  }
  if (!editing) {
    return (
      <div className="mt-1">
        {leave.note && <p className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300">{leave.note}</p>}
        <button onClick={() => setEditing(true)} className="text-xs text-navy dark:text-[#e3c65a] mt-1 hover:underline">
          {leave.note ? "تعديل الملاحظة" : "+ إضافة ملاحظة"}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-1 flex flex-col gap-2">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy" />
      <div className="flex gap-2">
        <Btn variant="subtle" className="text-xs py-1" onClick={() => { onSave(leave, value.trim()); setEditing(false); }}>حفظ</Btn>
        <Btn variant="ghost" className="text-xs py-1" onClick={() => { setValue(leave.note || ""); setEditing(false); }}>إلغاء</Btn>
      </div>
    </div>
  );
}

// بيحسب لكل شخص: أول 15 يوم في السنة (بترتيب التاريخ) = براتب كامل، وأي يوم بعدها = خصم من الراتب
function summarizeYear(leaves, userId, year) {
  const rows = leaves
    .filter((l) => l.user_id === userId && new Date(l.date).getFullYear() === year)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const paid = rows.slice(0, LEAVE_ANNUAL_PAID_DAYS);
  const unpaid = rows.slice(LEAVE_ANNUAL_PAID_DAYS);
  const paidIds = new Set(paid.map((r) => r.id));
  return {
    total: rows.length,
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    remaining: Math.max(0, LEAVE_ANNUAL_PAID_DAYS - paid.length),
    isPaid: (id) => paidIds.has(id),
  };
}

export default function LeavesPage() {
  const { profile } = useAuth();
  const data = useData();
  const isAdminLike = profile.role === "مدير" || profile.role === "أدمن";
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const set = new Set(data.leaves.map((l) => new Date(l.date).getFullYear()));
    set.add(currentYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [data.leaves, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [personFilter, setPersonFilter] = useState(isAdminLike ? "all" : profile.id);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ user_id: "", date: todayISO(), note: "" });

  const allProfiles = data.profiles || [];

  // للمحاسب/المتدرب: قاعدة البيانات أصلًا بترجعله سجلاته هو بس (RLS)، والفلتر هنا للعرض فقط
  const yearLeaves = data.leaves.filter((l) => new Date(l.date).getFullYear() === year);
  const visibleLeaves = isAdminLike && personFilter !== "all"
    ? yearLeaves.filter((l) => l.user_id === personFilter)
    : yearLeaves;
  const sorted = [...visibleLeaves].sort((a, b) => new Date(b.date) - new Date(a.date));

  const summaryUserId = isAdminLike ? (personFilter !== "all" ? personFilter : null) : profile.id;
  const summary = summaryUserId ? summarizeYear(data.leaves, summaryUserId, year) : null;

  const openAdd = () => {
    setForm({ user_id: personFilter !== "all" ? personFilter : "", date: todayISO(), note: "" });
    setModal(true);
  };

  const submit = async () => {
    if (!form.user_id || !form.date) return;
    const person = allProfiles.find((p) => p.id === form.user_id);
    if (!person) return;
    await data.addLeave({ user_id: person.id, user_name: person.display_name, date: form.date, note: form.note.trim() });
    setModal(false);
  };

  const saveNote = (leave, note) => data.updateLeave(leave, { note });
  const remove = async (leave) => {
    if (!confirm(`هل تريد حذف يوم الأجازة (${fmtDate(leave.date)}) الخاص بـ ${leave.user_name}؟`)) return;
    await data.deleteLeave(leave);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">رصيد الأجازات</h2>
        {isAdminLike && <Btn onClick={openAdd}><Plus size={16} /> تسجيل يوم أجازة</Btn>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </Select>
        {isAdminLike && (
          <Select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="w-56">
            <option value="all">كل الموظفين</option>
            {allProfiles.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </Select>
        )}
      </div>

      {summary && (
        <div className="flex gap-3 flex-wrap">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/15 text-gold shrink-0"><CalendarDays size={18} /></div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">أيام مأخوذة في {year}</div>
              <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{summary.total}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-600 shrink-0"><CheckCircle2 size={18} /></div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">متبقي من الـ {LEAVE_ANNUAL_PAID_DAYS} يوم المدفوعة</div>
              <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{summary.remaining}</div>
            </div>
          </Card>
          {summary.unpaidCount > 0 && (
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-600 shrink-0"><AlertTriangle size={18} /></div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-xs">أيام مخصومة من الراتب</div>
                <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{summary.unpaidCount}</div>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((l) => {
          const isPaid = summarizeYear(data.leaves, l.user_id, year).isPaid(l.id);
          return (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color={isPaid ? "green" : "red"}>{isPaid ? "براتب كامل" : "خصم من الراتب"}</Badge>
                    <span className="text-xs text-slate-400">{fmtDate(l.date)}</span>
                  </div>
                  {(isAdminLike && personFilter === "all") && <p className="text-slate-800 dark:text-slate-100 font-medium">{l.user_name}</p>}
                  <LeaveNote leave={l} canEdit={isAdminLike} onSave={saveNote} />
                </div>
                {isAdminLike && (
                  <button onClick={() => remove(l)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg shrink-0" title="حذف">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {sorted.length === 0 && <p className="text-center text-slate-400 py-8">لا يوجد أيام أجازة مسجلة في {year}</p>}
      </div>

      {isAdminLike && (
        <Modal open={modal} onClose={() => setModal(false)} title="تسجيل يوم أجازة">
          <div className="flex flex-col gap-3">
            <Select label="الموظف *" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">اختر الموظف</option>
              {allProfiles.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </Select>
            <Input label="التاريخ *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <TextArea label="ملاحظة (اختياري)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setModal(false)}>إلغاء</Btn>
              <Btn onClick={submit}>تسجيل</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
