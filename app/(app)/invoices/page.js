"use client";
import { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Input, Select, TextArea, Badge, Modal, SortableTh } from "../../../components/ui";
import { fmtDate, fmtMoney, sortRows, todayISO } from "../../../lib/helpers";

const emptyForm = () => ({ client_id: "", amount: "", status: "معلقة", description: "", date: todayISO() });

export default function InvoicesPage() {
  const { profile } = useAuth();
  const data = useData();
  const canEdit = profile.role === "مدير" || profile.role === "أدمن";
  const [sort, setSort] = useState({ key: "date", dir: "desc" });
  const [filterClient, setFilterClient] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterVat, setFilterVat] = useState("");
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', invoice?}
  const [form, setForm] = useState(emptyForm());

  const clientOf = (id) => data.clients.find((c) => c.id === id);
  const rows = sortRows(data.invoices.filter((i) => {
    if (filterClient && i.client_id !== filterClient) return false;
    const c = clientOf(i.client_id);
    if (filterEntity && c?.entity_type !== filterEntity) return false;
    if (filterVat && c?.vat_status !== filterVat) return false;
    return true;
  }), sort);
  const clientName = (id) => clientOf(id)?.name || "—";

  const openAdd = () => { setForm(emptyForm()); setModal({ mode: "add" }); };
  const openEdit = (inv) => {
    setForm({ client_id: inv.client_id, amount: inv.amount, status: inv.status, description: inv.description || "", date: inv.date });
    setModal({ mode: "edit", invoice: inv });
  };

  const save = async () => {
    if (!form.client_id || !form.amount) return;
    if (modal.mode === "add") {
      await data.addInvoice({ ...form, amount: Number(form.amount) });
    } else {
      await data.updateInvoice(modal.invoice.id, { ...form, amount: Number(form.amount) });
    }
    setModal(null);
  };

  const remove = async (inv) => {
    if (!confirm("حذف هذه الفاتورة؟")) return;
    await data.deleteInvoice(inv);
  };

  const statusColor = (s) => (s === "مدفوعة" ? "green" : s === "جزئي" ? "blue" : "amber");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">الفواتير</h2>
        <Btn onClick={openAdd}><Plus size={16} /> إضافة فاتورة</Btn>
      </div>

      <Card className="p-4 flex flex-wrap gap-3">
        <Select label="العميل" value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="min-w-[180px]">
          <option value="">كل العملاء</option>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="نوع المنشأة" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className="min-w-[140px]">
          <option value="">الكل</option><option value="فردي">فردي</option><option value="شركة">شركة</option>
        </Select>
        <Select label="ق.م" value={filterVat} onChange={(e) => setFilterVat(e.target.value)} className="min-w-[140px]">
          <option value="">الكل</option><option value="لا">لا</option><option value="نعم">نعم</option><option value="ربع سنوي">ربع سنوي</option>
        </Select>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[750px]">
          <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <SortableTh label="التاريخ" sortKey="date" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">العميل</th>
              <SortableTh label="المبلغ" sortKey="amount" sort={sort} setSort={setSort} />
              <SortableTh label="الحالة" sortKey="status" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">وصف الخدمة</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2">{fmtDate(i.date)}</td>
                <td className="px-3 py-2 font-medium">{clientName(i.client_id)}</td>
                <td className="px-3 py-2">{fmtMoney(i.amount)}</td>
                <td className="px-3 py-2"><Badge color={statusColor(i.status)}>{i.status}</Badge></td>
                <td className="px-3 py-2 text-slate-500">{i.description}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {canEdit && <button onClick={() => openEdit(i)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Edit2 size={14} /></button>}
                    <button onClick={() => remove(i)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">لا يوجد فواتير</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "تعديل الفاتورة" : "إضافة فاتورة جديدة"}>
        <div className="flex flex-col gap-3">
          <Select label="العميل *" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">اختر العميل</option>
            {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="المبلغ *" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="معلقة">معلقة</option><option value="جزئي">جزئي</option><option value="مدفوعة">مدفوعة</option>
          </Select>
          <Input label="التاريخ" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <TextArea label="وصف الخدمة" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={() => setModal(null)}>إلغاء</Btn><Btn onClick={save}>حفظ</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
