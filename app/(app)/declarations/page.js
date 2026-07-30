"use client";
import { useState, useMemo } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "../../../lib/AuthContext";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Select, Input, Badge, Modal, SortableTh } from "../../../components/ui";
import { fmtDate, fmtMoney, sortRows, generateAllDeclarations, declarationRemaining, declarationPaid } from "../../../lib/helpers";

function PaymentModal({ declaration, onClose, onSave }) {
  const [amount, setAmount] = useState(declaration.amount ?? "");
  const [option, setOption] = useState(declaration.fully_paid || "");
  const [paidAmount, setPaidAmount] = useState(declaration.paid_amount ?? "");

  const remaining = useMemo(() => {
    const amt = Number(amount) || 0;
    if (option === "كامل" || option === "صفري") return 0;
    if (option === "جزء") return Math.max(amt - (Number(paidAmount) || 0), 0);
    return amt;
  }, [amount, option, paidAmount]);

  const save = () => {
    onSave({
      amount: amount === "" ? null : Number(amount),
      fully_paid: option || null,
      paid_amount: option === "جزء" ? (paidAmount === "" ? null : Number(paidAmount)) : null,
    });
  };

  return (
    <Modal open onClose={onClose} title={`سداد إقرار — ${declaration.clientName}`}>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500 -mt-1">{declaration.type} — {declaration.period}</p>
        <Input label="قيمة الإقرار الإجمالية" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        <Select label="حالة السداد" value={option} onChange={(e) => setOption(e.target.value)}>
          <option value="">-- اختر --</option>
          <option value="كامل">مدفوع كامل</option>
          <option value="صفري">صفري (لا يوجد مبلغ مستحق)</option>
          <option value="جزء">مبلغ جزئي</option>
        </Select>
        {option === "جزء" && (
          <Input label="المبلغ المدفوع" type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" />
        )}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-2 text-sm">
          <span className="text-slate-500">المتبقي</span>
          <span className={`font-bold ${remaining > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmtMoney(remaining)}</span>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Btn variant="ghost" onClick={onClose}>إلغاء</Btn><Btn onClick={save}>حفظ</Btn></div>
      </div>
    </Modal>
  );
}

function OverdueAmountsModal({ items, onClose }) {
  const total = items.reduce((s, d) => s + declarationRemaining(d), 0);
  return (
    <Modal open onClose={onClose} title="مبالغ إقرارات متأخرة" wide>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">إجمالي المبالغ المستحقة</span>
          <span className="font-bold text-rose-600">{fmtMoney(total)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-right">العميل</th>
                <th className="px-3 py-2 text-right">نوع الإقرار</th>
                <th className="px-3 py-2 text-right">الفترة</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">الموعد النهائي</th>
                <th className="px-3 py-2 text-right">مبلغ الإقرار</th>
                <th className="px-3 py-2 text-right">المدفوع</th>
                <th className="px-3 py-2 text-right">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.key} className="border-b border-slate-100 dark:border-slate-700/50">
                  <td className="px-3 py-1.5 font-medium">{d.clientName}</td>
                  <td className="px-3 py-1.5">{d.type}</td>
                  <td className="px-3 py-1.5">{d.period}</td>
                  <td className="px-3 py-1.5"><Badge color={d.status === "متأخر" ? "red" : "amber"}>{d.status}</Badge></td>
                  <td className="px-3 py-1.5">{fmtDate(d.deadline)}</td>
                  <td className="px-3 py-1.5">{fmtMoney(d.amount || 0)}</td>
                  <td className="px-3 py-1.5 text-emerald-600">{fmtMoney(declarationPaid(d))}</td>
                  <td className="px-3 py-1.5 font-semibold text-rose-600">{fmtMoney(declarationRemaining(d))}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={8} className="text-center py-6 text-slate-400">لا يوجد مبالغ مستحقة حاليًا</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

export default function DeclarationsPage() {
  const { profile } = useAuth();
  const data = useData();
  const [fClient, setFClient] = useState("");
  const [fType, setFType] = useState("");
  const [fEntity, setFEntity] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fMonth, setFMonth] = useState("");
  const [sort, setSort] = useState({ key: "deadline", dir: "asc" });
  const [payModal, setPayModal] = useState(null);
  const [showOverdueAmounts, setShowOverdueAmounts] = useState(false);

  const all = useMemo(() => generateAllDeclarations(data.clients, data.declarationStatus), [data.clients, data.declarationStatus]);

  const filtered = all.filter((d) =>
    (!fClient || d.clientId === fClient) &&
    (!fType || d.type === fType) &&
    (!fEntity || d.entityType === fEntity) &&
    (!fStatus || d.status === fStatus) &&
    (!fMonth || d.period.includes(fMonth))
  );
  const rows = sortRows(filtered, sort);

  // مبالغ مستحقة = أي إقرار عليه فلوس متبقية، مهما كانت حالته (متأخر، قيد الانتظار، أو حتى مكتمل ولسه مسدّدش بالكامل)
  const outstandingAmounts = all.filter((d) => declarationRemaining(d) > 0);
  const counts = {
    pending: all.filter((d) => d.status === "قيد الانتظار").length,
    late: all.filter((d) => d.status === "متأخر").length,
    done: all.filter((d) => d.status === "مكتمل").length,
    all: all.length,
    outstandingAmount: outstandingAmounts.reduce((s, d) => s + declarationRemaining(d), 0),
  };

  const toggleComplete = async (d) => {
    const cur = data.declarationStatus[d.key] || {};
    await data.upsertDeclaration(d.key, {
      completed: !cur.completed,
      completed_by: !cur.completed ? profile.display_name : null,
      completed_at: !cur.completed ? new Date().toISOString() : null,
    }, d.clientId);
  };

  const savePayment = async (patch) => {
    await data.upsertDeclaration(payModal.key, patch, payModal.clientId);
    setPayModal(null);
  };

  const [bulkBusy, setBulkBusy] = useState(false);
  const uncompletedInView = rows.filter((d) => !d.completed);
  const markAllComplete = async () => {
    if (uncompletedInView.length === 0) return;
    if (!confirm(`هل تريد تعليم ${uncompletedInView.length} إقرار من النتائج المفلترة كـ"مكتمل"؟`)) return;
    setBulkBusy(true);
    await Promise.all(uncompletedInView.map((d) => data.upsertDeclaration(d.key, {
      completed: true, completed_by: profile.display_name, completed_at: new Date().toISOString(),
    }, d.clientId)));
    setBulkBusy(false);
  };

  const types = [...new Set(all.map((d) => d.type))];

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">الإقرارات</h2>
      <p className="text-sm text-slate-500 -mt-3">القائمة بتعرض الإقرارات من بداية 2025 وحتى نهاية الشهر الحالي — اللي فتح ميعاد تقديمها، اتأخرت، أو خلصت.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4"><div className="text-xs text-slate-500">قيد الانتظار</div><div className="font-bold text-lg text-amber-600">{counts.pending}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">متأخرة</div><div className="font-bold text-lg text-rose-600">{counts.late}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">مكتملة</div><div className="font-bold text-lg text-emerald-600">{counts.done}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">الإجمالي</div><div className="font-bold text-lg text-slate-800 dark:text-slate-100">{counts.all}</div></Card>
        <Card className="p-4 cursor-pointer hover:ring-2 hover:ring-rose-300 transition" onClick={() => setShowOverdueAmounts(true)}>
          <div className="text-xs text-slate-500 flex items-center gap-1"><Wallet size={12} /> مبالغ إقرارات متأخرة</div>
          <div className="font-bold text-lg text-rose-600">{fmtMoney(counts.outstandingAmount)}</div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap gap-3">
        <Select label="العميل" value={fClient} onChange={(e) => setFClient(e.target.value)} className="min-w-[160px]">
          <option value="">الكل</option>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="نوع الإقرار" value={fType} onChange={(e) => setFType(e.target.value)} className="min-w-[180px]">
          <option value="">الكل</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="نوع المنشأة" value={fEntity} onChange={(e) => setFEntity(e.target.value)} className="min-w-[140px]">
          <option value="">الكل</option><option value="فردي">فردي</option><option value="شركة">شركة</option>
        </Select>
        <Select label="الحالة" value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="min-w-[140px]">
          <option value="">الكل</option>
          <option value="قيد الانتظار">قيد الانتظار</option>
          <option value="متأخر">متأخر</option>
          <option value="مكتمل">مكتمل</option>
        </Select>
        <Input label="الشهر/السنة" placeholder="مثال: يناير أو 2025" value={fMonth} onChange={(e) => setFMonth(e.target.value)} className="min-w-[140px]" />
        <div className="flex items-end">
          <Btn variant="gold" onClick={markAllComplete} disabled={bulkBusy || uncompletedInView.length === 0}>
            علّم الكل كمكتمل {uncompletedInView.length > 0 ? `(${uncompletedInView.length})` : ""}
          </Btn>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[950px]">
          <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <SortableTh label="العميل" sortKey="clientName" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">نوع المنشأة</th>
              <SortableTh label="نوع الإقرار" sortKey="type" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">الفترة</th>
              <SortableTh label="الموعد النهائي" sortKey="deadline" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">الحالة</th>
              <th className="px-3 py-2 text-right">السداد</th>
              <th className="px-3 py-2 text-right">أنجز بواسطة</th>
              <th className="px-3 py-2 text-right">تم</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const remaining = declarationRemaining(d);
              return (
                <tr key={d.key} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-3 py-2 font-medium">{d.clientName}</td>
                  <td className="px-3 py-2">{d.entityType}</td>
                  <td className="px-3 py-2">{d.type}</td>
                  <td className="px-3 py-2">{d.period}</td>
                  <td className="px-3 py-2">{fmtDate(d.deadline)}</td>
                  <td className="px-3 py-2"><Badge color={d.status === "مكتمل" ? "green" : d.status === "متأخر" ? "red" : "amber"}>{d.status}</Badge></td>
                  <td className="px-3 py-2">
                    <button onClick={() => setPayModal(d)} className="text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1">
                      <Wallet size={12} />
                      {d.amount == null ? "تحديد السداد" : remaining > 0 ? <span className="text-rose-600 font-semibold">متبقي {fmtMoney(remaining)}</span> : <span className="text-emerald-600 font-semibold">مسدد بالكامل</span>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{d.completed_by || "-"}</td>
                  <td className="px-3 py-2"><input type="checkbox" checked={!!d.completed} onChange={() => toggleComplete(d)} className="w-4 h-4 accent-navy" /></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">لا يوجد إقرارات مطابقة</td></tr>}
          </tbody>
        </table>
      </Card>

      {payModal && <PaymentModal declaration={payModal} onClose={() => setPayModal(null)} onSave={savePayment} />}
      {showOverdueAmounts && <OverdueAmountsModal items={outstandingAmounts} onClose={() => setShowOverdueAmounts(false)} />}
    </div>
  );
}
