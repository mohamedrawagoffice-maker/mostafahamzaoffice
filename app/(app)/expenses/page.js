"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Input, Select, TextArea, SortableTh, Modal } from "../../../components/ui";
import { fmtDate, fmtMoney, sortRows, todayISO } from "../../../lib/helpers";

export default function ExpensesPage() {
  const data = useData();
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ category: data.settings.expense_categories[0] || "", amount: "", client_id: "", description: "", date: todayISO() });

  const rows = sortRows(data.expenses, sort);
  const clientName = (id) => (id ? data.clients.find((c) => c.id === id)?.name : null);

  const save = async () => {
    if (!form.category || !form.amount) return;
    const payload = { ...form, amount: Number(form.amount), client_id: form.client_id || null };
    await data.addExpense(payload);
    setForm({ category: data.settings.expense_categories[0] || "", amount: "", client_id: "", description: "", date: todayISO() });
    setModal(false);
  };

  const remove = async (exp) => {
    if (!confirm("حذف هذا المصروف؟")) return;
    await data.deleteExpense(exp);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">المصروفات</h2>
        <Btn onClick={() => setModal(true)}><Plus size={16} /> إضافة مصروف</Btn>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[750px]">
          <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <SortableTh label="التاريخ" sortKey="date" sort={sort} setSort={setSort} />
              <SortableTh label="التصنيف" sortKey="category" sort={sort} setSort={setSort} />
              <SortableTh label="المبلغ" sortKey="amount" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">مرتبط بعميل</th>
              <th className="px-3 py-2 text-right">وصف</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((exp) => (
              <tr key={exp.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2">{fmtDate(exp.date)}</td>
                <td className="px-3 py-2 font-medium">{exp.category}</td>
                <td className="px-3 py-2">{fmtMoney(exp.amount)}</td>
                <td className="px-3 py-2">{clientName(exp.client_id) || <span className="text-slate-400">-</span>}</td>
                <td className="px-3 py-2 text-slate-500">{exp.description}</td>
                <td className="px-3 py-2"><button onClick={() => remove(exp)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">لا يوجد مصروفات</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="إضافة مصروف جديد">
        <div className="flex flex-col gap-3">
          <Select label="التصنيف *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {data.settings.expense_categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="المبلغ *" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="ربط بعميل (اختياري)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">بدون</option>
            {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="التاريخ" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <TextArea label="وصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(false)}>إلغاء</Btn><Btn onClick={save}>حفظ</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
