"use client";
import { useState, useMemo } from "react";
import { Plus, Minus, Wallet, Trash2, HandCoins, ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Input, TextArea, Select, Badge, Modal } from "../../../components/ui";
import { fmtDate, fmtMoney, todayISO } from "../../../lib/helpers";

// بيحسب لشخص معين: الرصيد الحالي + إجمالي المضاف/المدفوع/المُسوّى النهاردة بس
function summarizePerson(custody, userId) {
  const rows = custody.filter((c) => c.user_id === userId);
  const sum = (type) => rows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.amount), 0);
  const added = sum("إضافة"), paid = sum("دفع"), settled = sum("تسوية");
  const balance = added - paid - settled;

  const today = todayISO();
  const todayRows = rows.filter((r) => r.date === today);
  const todaySum = (type) => todayRows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.amount), 0);

  return {
    balance, rows,
    todayAdded: todaySum("إضافة"), todayPaid: todaySum("دفع"), todaySettled: todaySum("تسوية"),
  };
}

const TYPE_META = {
  "إضافة": { color: "green", icon: ArrowDownCircle, label: "إضافة عهدة" },
  "دفع": { color: "red", icon: ArrowUpCircle, label: "دفعة" },
  "تسوية": { color: "blue", icon: RotateCcw, label: "تسوية / استلام" },
};

export default function CustodyPage() {
  const { profile } = useAuth();
  const data = useData();
  const isAdminLike = profile.role === "مدير" || profile.role === "أدمن";

  // أي شخص في المكتب ممكن يكون معاه عهدة، بما فيهم المدير والأدمن نفسهم
  const custodyHolders = useMemo(() => data.profiles || [], [data.profiles]);

  const [personFilter, setPersonFilter] = useState(isAdminLike ? "" : profile.id);
  const [addModal, setAddModal] = useState(null); // "إضافة" | "تسوية" | "دفع" | null
  const [form, setForm] = useState({ user_id: "", amount: "", date: todayISO(), note: "", client_id: "", client_name_manual: "" });

  const selectedId = isAdminLike ? personFilter : profile.id;
  const selectedPerson = custodyHolders.find((p) => p.id === selectedId);
  const summary = selectedId ? summarizePerson(data.custody, selectedId) : null;
  const sortedRows = summary ? [...summary.rows].sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)) : [];

  const openModal = (type) => {
    setForm({
      user_id: isAdminLike ? (selectedId || "") : profile.id,
      amount: "", date: todayISO(), note: "", client_id: "", client_name_manual: "",
    });
    setAddModal(type);
  };

  const submit = async () => {
    if (!form.user_id || !form.amount || Number(form.amount) <= 0) return;
    const person = isAdminLike ? custodyHolders.find((p) => p.id === form.user_id) : profile;
    if (!person) return;
    const payload = {
      user_id: person.id, user_name: person.display_name,
      type: addModal, amount: Number(form.amount), date: form.date, note: form.note.trim(),
    };
    if (addModal === "دفع") {
      payload.client_id = form.client_id || null;
      payload.client_name_manual = form.client_id ? null : (form.client_name_manual.trim() || null);
    }
    await data.addCustody(payload);
    setAddModal(null);
  };

  const remove = async (entry) => {
    if (!confirm(`هل تريد حذف هذه الحركة (${TYPE_META[entry.type].label} - ${fmtMoney(entry.amount)})؟`)) return;
    await data.deleteCustody(entry);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">العهدة</h2>
        {!isAdminLike && <Btn onClick={() => openModal("دفع")}><Plus size={16} /> تسجيل دفعة</Btn>}
      </div>

      {/* نظرة عامة للمدير/الأدمن على عهدة كل محاسب */}
      {isAdminLike && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {custodyHolders.map((p) => {
            const s = summarizePerson(data.custody, p.id);
            const active = personFilter === p.id;
            return (
              <Card key={p.id}
                className={`p-4 cursor-pointer transition ${active ? "ring-2 ring-navy" : ""}`}
                onClick={() => setPersonFilter(active ? "" : p.id)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{p.display_name}</span>
                  <HandCoins size={16} className="text-gold" />
                </div>
                <div className={`text-2xl font-black mb-2 ${s.balance < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {fmtMoney(s.balance)}
                </div>
                <div className="flex gap-2 flex-wrap text-[11px]">
                  {s.todayAdded > 0 && <Badge color="green">+{fmtMoney(s.todayAdded)} اليوم</Badge>}
                  {s.todayPaid > 0 && <Badge color="red">-{fmtMoney(s.todayPaid)} اليوم</Badge>}
                  {s.todaySettled > 0 && <Badge color="blue">تسوية {fmtMoney(s.todaySettled)}</Badge>}
                  {s.todayAdded === 0 && s.todayPaid === 0 && s.todaySettled === 0 && <span className="text-slate-400">لا حركة اليوم</span>}
                </div>
              </Card>
            );
          })}
          {custodyHolders.length === 0 && <p className="text-slate-400 text-sm">لا يوجد محاسبين مسجلين بعد.</p>}
        </div>
      )}

      {/* تفاصيل الشخص المختار */}
      {selectedId && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Card className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold/15 text-gold shrink-0"><Wallet size={18} /></div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs">
                    {isAdminLike ? `رصيد ${selectedPerson?.display_name || ""}` : "رصيدك الحالي"}
                  </div>
                  <div className={`font-bold text-lg ${summary.balance < 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-100"}`}>
                    {fmtMoney(summary.balance)}
                    {summary.balance < 0 && <span className="text-xs font-normal text-rose-500 mr-1">(مدين للمكتب)</span>}
                  </div>
                </div>
              </Card>
            </div>
            {isAdminLike && (
              <div className="flex gap-2 flex-wrap">
                <Btn variant="subtle" onClick={() => openModal("إضافة")}><Plus size={16} /> إضافة عهدة</Btn>
                <Btn variant="ghost" onClick={() => openModal("تسوية")}><Minus size={16} /> تسوية / استلام</Btn>
                <Btn variant="ghost" onClick={() => openModal("دفع")}><Plus size={16} /> تسجيل دفعة نيابة عنه</Btn>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {sortedRows.map((r) => {
              const meta = TYPE_META[r.type];
              const Icon = meta.icon;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.type === "دفع" ? "bg-rose-500/15 text-rose-600" : r.type === "تسوية" ? "bg-sky-500/15 text-sky-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge color={meta.color}>{meta.label}</Badge>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{fmtMoney(r.amount)}</span>
                          <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                        </div>
                        {r.type === "دفع" && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {r.client_id ? (data.clients.find((c) => c.id === r.client_id)?.name || "عميل محذوف") : (r.client_name_manual || "عميل غير مسجل")}
                          </p>
                        )}
                        {r.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.note}</p>}
                      </div>
                    </div>
                    {isAdminLike && (
                      <button onClick={() => remove(r)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg shrink-0" title="حذف">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
            {sortedRows.length === 0 && <p className="text-center text-slate-400 py-8">لا يوجد حركات عهدة مسجلة بعد</p>}
          </div>
        </>
      )}

      {isAdminLike && !selectedId && (
        <p className="text-center text-slate-400 py-6">اختر محاسبًا من الأعلى لعرض وإدارة عهدته</p>
      )}

      <Modal open={!!addModal} onClose={() => setAddModal(null)} title={addModal ? TYPE_META[addModal].label : ""}>
        <div className="flex flex-col gap-3">
          {isAdminLike && (
            <Select label="الموظف *" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">اختر الموظف</option>
              {custodyHolders.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </Select>
          )}
          <Input label="المبلغ *" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="التاريخ *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          {addModal === "دفع" && (
            <>
              <Select label="العميل (اختياري لو عميل غير مسجل)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, client_name_manual: "" })}>
                <option value="">— عميل غير مسجل —</option>
                {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {!form.client_id && (
                <Input label="اسم العميل غير المسجل" value={form.client_name_manual} onChange={(e) => setForm({ ...form, client_name_manual: e.target.value })} placeholder="اكتب اسم العميل" />
              )}
            </>
          )}
          <TextArea label="ملاحظة (اختياري)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setAddModal(null)}>إلغاء</Btn>
            <Btn onClick={submit}>حفظ</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
