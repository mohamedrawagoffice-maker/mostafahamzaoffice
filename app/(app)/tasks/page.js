"use client";
import { useState } from "react";
import { Plus, Check, CheckCircle2, Trash2 } from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, TextArea, Select, Badge, Modal } from "../../../components/ui";
import { fmtDate } from "../../../lib/helpers";
import { TASK_PRIORITIES } from "../../../lib/constants";

function TaskNote({ task, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.note || "");

  const save = async () => {
    await onSave(task, value.trim());
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="mt-2">
        {task.note && <p className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-slate-300">{task.note}</p>}
        <button onClick={() => setEditing(true)} className="text-xs text-navy dark:text-[#e3c65a] mt-1 hover:underline">
          {task.note ? "تعديل الملاحظة" : "+ إضافة ملاحظة"}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy" />
      <div className="flex gap-2">
        <Btn variant="subtle" className="text-xs py-1" onClick={save}>حفظ الملاحظة</Btn>
        <Btn variant="ghost" className="text-xs py-1" onClick={() => { setValue(task.note || ""); setEditing(false); }}>إلغاء</Btn>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { profile } = useAuth();
  const data = useData();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ text: "", priority: "عادي", to_user_id: "" });
  const isAdminLike = profile.role === "مدير" || profile.role === "أدمن";
  const isAdmin = profile.role === "أدمن"; // حذف المهام مقصور على الأدمن فقط، مش المدير

  // ملاحظة: صلاحيات RLS في قاعدة البيانات تمنع أصلًا المحاسب/المتدرب من رؤية مهام غيرهم،
  // فهذا الفلتر هنا للعرض فقط، والحماية الحقيقية على مستوى قاعدة البيانات.
  const visibleTasks = data.tasks;
  const sorted = [...visibleTasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const otherProfiles = (data.profiles || []).filter((p) => p.id !== profile.id);

  const send = async () => {
    if (!form.text.trim() || !form.to_user_id) return;
    const recipient = otherProfiles.find((p) => p.id === form.to_user_id);
    if (!recipient) return;
    await data.addTask({ text: form.text, priority: form.priority, to_user: recipient.display_name, to_user_id: recipient.id, status: "جديد" });
    setForm({ text: "", priority: "عادي", to_user_id: "" });
    setModal(false);
  };

  const ack = (t) => data.updateTask(t, { status: "تم العلم", ack_at: new Date().toISOString() });
  const approve = (t) => data.updateTask(t, { status: "معتمد التنفيذ", approved_at: new Date().toISOString() });
  const saveNote = (t, note) => data.updateTask(t, { note });
  const remove = async (t) => {
    if (!confirm("هل تريد حذف هذه المهمة نهائيًا؟")) return;
    await data.deleteTask(t);
  };

  const priorityColor = (p) => p === "عاجل" ? "red" : p === "معلومة" ? "blue" : "slate";
  const statusColor = (s) => s === "معتمد التنفيذ" ? "green" : s === "تم العلم" ? "blue" : "amber";
  const unapprovedCount = visibleTasks.filter((t) => t.status !== "معتمد التنفيذ").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">المهام</h2>
        <Btn onClick={() => setModal(true)}><Plus size={16} /> مهمة جديدة</Btn>
      </div>

      <Card className="p-4 flex items-center gap-3 w-fit">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/15 text-gold shrink-0"><CheckCircle2 size={18} /></div>
        <div>
          <div className="text-slate-500 dark:text-slate-400 text-xs">مهام لسه محتاجة اعتماد تنفيذ</div>
          <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{unapprovedCount}</div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {sorted.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge color={priorityColor(t.priority)}>{t.priority}</Badge>
                  <Badge color={statusColor(t.status)}>{t.status}</Badge>
                  <span className="text-xs text-slate-400">{fmtDate(t.created_at)}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-100">{t.text}</p>
                <p className="text-xs text-slate-500 mt-1">من: {t.from_user} ← إلى: {t.to_user}</p>
                <TaskNote task={t} onSave={saveNote} />
              </div>
              <div className="flex gap-2 shrink-0">
                {t.to_user_id === profile.id && t.status === "جديد" && <Btn variant="subtle" onClick={() => ack(t)}><Check size={14} /> علم بالتنفيذ</Btn>}
                {isAdminLike && t.status !== "معتمد التنفيذ" && <Btn variant="gold" onClick={() => approve(t)}><CheckCircle2 size={14} /> اعتماد التنفيذ</Btn>}
                {isAdmin && <button onClick={() => remove(t)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg" title="حذف المهمة"><Trash2 size={16} /></button>}
              </div>
            </div>
          </Card>
        ))}
        {sorted.length === 0 && <p className="text-center text-slate-400 py-8">لا يوجد مهام</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="إرسال مهمة جديدة">
        <div className="flex flex-col gap-3">
          <TextArea label="نص المهمة / الإشعار *" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={3} />
          <Select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select label="موجهة إلى *" value={form.to_user_id} onChange={(e) => setForm({ ...form, to_user_id: e.target.value })}>
            <option value="">اختر الشخص</option>
            {otherProfiles.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(false)}>إلغاء</Btn><Btn onClick={send}>إرسال</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
