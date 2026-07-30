"use client";
import { useState, useMemo } from "react";
import { Users, FileText, Wallet, CheckCircle2, Clock, ClipboardCheck } from "lucide-react";
import { useData } from "../../../lib/DataContext";
import { Card, Modal, Badge } from "../../../components/ui";
import { fmtMoney, fmtDate, generateAllDeclarations, declarationRemaining, declarationPaid } from "../../../lib/helpers";

function DetailModal({ title, columns, rows, totalLabel, totalValue, onClose }) {
  const [filters, setFilters] = useState({});
  const filterableCols = columns.filter((c) => c.filterable);
  const filteredRows = rows.filter((r) => filterableCols.every((c) => !filters[c.header] || c.value(r) === filters[c.header]));

  return (
    <Modal open onClose={onClose} title={title} wide>
      <div className="flex flex-col gap-3">
        {filterableCols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterableCols.map((c) => {
              const options = [...new Set(rows.map((r) => c.value(r)).filter((v) => v !== null && v !== undefined && v !== ""))];
              return (
                <select key={c.header} value={filters[c.header] || ""} onChange={(e) => setFilters((f) => ({ ...f, [c.header]: e.target.value }))}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                  <option value="">{c.header}: الكل</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              );
            })}
          </div>
        )}
        {totalLabel && (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">{totalLabel}</span>
            <span className="font-bold text-navy dark:text-[#e3c65a]">{totalValue}</span>
          </div>
        )}
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <tr>{columns.map((c) => <th key={c.header} className="px-3 py-2 text-right whitespace-nowrap">{c.header}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                  {columns.map((c) => <td key={c.header} className="px-3 py-1.5 whitespace-nowrap">{c.render(r)}</td>)}
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={columns.length} className="text-center py-6 text-slate-400">لا يوجد بيانات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

export default function DashboardPage() {
  const data = useData();
  const [mode, setMode] = useState("month");
  const [detail, setDetail] = useState(null); // key of active detail modal
  const now = new Date();

  const inScope = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (mode === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return d.getFullYear() === now.getFullYear();
  };

  const invoicesScope = data.invoices.filter((i) => inScope(i.date));
  const expensesScope = data.expenses.filter((e) => inScope(e.date));
  const totalInvoices = invoicesScope.reduce((s, i) => s + Number(i.amount || 0), 0);
  const collected = invoicesScope.filter((i) => i.status === "مدفوعة").reduce((s, i) => s + Number(i.amount || 0), 0);
  const pending = totalInvoices - collected;
  const totalExpenses = expensesScope.reduce((s, e) => s + Number(e.amount || 0), 0);
  const declarations = useMemo(() => generateAllDeclarations(data.clients, data.declarationStatus), [data.clients, data.declarationStatus]);
  const lateDeclarations = declarations.filter((d) => d.status === "متأخر");
  const outstandingDeclarations = declarations.filter((d) => declarationRemaining(d) > 0);
  const outstandingTotal = outstandingDeclarations.reduce((s, d) => s + declarationRemaining(d), 0);

  const clientName = (id) => data.clients.find((c) => c.id === id)?.name || "—";

  // تعريف تفاصيل كل كارت (الأعمدة والصفوف اللي هتظهر لما تدوس عليه)
  const detailConfigs = {
    clients: {
      title: "تفاصيل العملاء",
      rows: data.clients,
      columns: [
        { header: "الاسم", render: (c) => c.name },
        { header: "نوع المنشأة", render: (c) => c.entity_type, filterable: true, value: (c) => c.entity_type },
        { header: "ق.م", render: (c) => c.vat_status, filterable: true, value: (c) => c.vat_status },
        { header: "التليفون", render: (c) => c.phone || "-" },
        { header: "تاريخ التسجيل", render: (c) => fmtDate(c.reg_date) },
      ],
    },
    invoices: {
      title: "تفاصيل الفواتير",
      rows: invoicesScope,
      totalLabel: "إجمالي الفواتير",
      totalValue: fmtMoney(totalInvoices),
      columns: [
        { header: "العميل", render: (i) => clientName(i.client_id), filterable: true, value: (i) => clientName(i.client_id) },
        { header: "المبلغ", render: (i) => fmtMoney(i.amount) },
        { header: "الحالة", render: (i) => <Badge color={i.status === "مدفوعة" ? "green" : i.status === "جزئي" ? "blue" : "amber"}>{i.status}</Badge>, filterable: true, value: (i) => i.status },
        { header: "التاريخ", render: (i) => fmtDate(i.date) },
      ],
    },
    collected: {
      title: "الفواتير المحصّلة",
      rows: invoicesScope.filter((i) => i.status === "مدفوعة"),
      totalLabel: "إجمالي المحصّل",
      totalValue: fmtMoney(collected),
      columns: [
        { header: "العميل", render: (i) => clientName(i.client_id), filterable: true, value: (i) => clientName(i.client_id) },
        { header: "المبلغ", render: (i) => fmtMoney(i.amount) },
        { header: "التاريخ", render: (i) => fmtDate(i.date) },
      ],
    },
    pending: {
      title: "الفواتير المعلّقة",
      rows: invoicesScope.filter((i) => i.status !== "مدفوعة"),
      totalLabel: "إجمالي المعلّق",
      totalValue: fmtMoney(pending),
      columns: [
        { header: "العميل", render: (i) => clientName(i.client_id), filterable: true, value: (i) => clientName(i.client_id) },
        { header: "المبلغ", render: (i) => fmtMoney(i.amount) },
        { header: "الحالة", render: (i) => <Badge color={i.status === "جزئي" ? "blue" : "amber"}>{i.status}</Badge>, filterable: true, value: (i) => i.status },
        { header: "التاريخ", render: (i) => fmtDate(i.date) },
      ],
    },
    expenses: {
      title: "تفاصيل المصروفات",
      rows: expensesScope,
      totalLabel: "إجمالي المصروفات",
      totalValue: fmtMoney(totalExpenses),
      columns: [
        { header: "التصنيف", render: (e) => e.category, filterable: true, value: (e) => e.category },
        { header: "المبلغ", render: (e) => fmtMoney(e.amount) },
        { header: "مرتبط بعميل", render: (e) => (e.client_id ? clientName(e.client_id) : "-"), filterable: true, value: (e) => (e.client_id ? clientName(e.client_id) : "") },
        { header: "التاريخ", render: (e) => fmtDate(e.date) },
      ],
    },
    lateDeclarations: {
      title: "الإقرارات المتأخرة",
      rows: lateDeclarations,
      columns: [
        { header: "العميل", render: (d) => d.clientName, filterable: true, value: (d) => d.clientName },
        { header: "نوع الإقرار", render: (d) => d.type, filterable: true, value: (d) => d.type },
        { header: "الفترة", render: (d) => d.period },
        { header: "الموعد النهائي", render: (d) => fmtDate(d.deadline) },
      ],
    },
    outstandingAmounts: {
      title: "مبالغ إقرارات متأخرة",
      rows: outstandingDeclarations,
      totalLabel: "إجمالي المستحق",
      totalValue: fmtMoney(outstandingTotal),
      columns: [
        { header: "العميل", render: (d) => d.clientName, filterable: true, value: (d) => d.clientName },
        { header: "نوع الإقرار", render: (d) => d.type, filterable: true, value: (d) => d.type },
        { header: "الفترة", render: (d) => d.period },
        { header: "الحالة", render: (d) => <Badge color={d.status === "متأخر" ? "red" : "amber"}>{d.status}</Badge>, filterable: true, value: (d) => d.status },
        { header: "مبلغ الإقرار", render: (d) => fmtMoney(d.amount || 0) },
        { header: "المدفوع", render: (d) => fmtMoney(declarationPaid(d)) },
        { header: "المتبقي", render: (d) => <span className="font-semibold text-rose-600">{fmtMoney(declarationRemaining(d))}</span> },
      ],
    },
  };

  const stat = (label, value, color, Icon, key) => (
    <Card
      className="p-4 flex items-center gap-3 cursor-pointer hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600 transition"
      onClick={() => setDetail(key)}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "22", color }}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-slate-500 dark:text-slate-400 text-xs">{label}</div>
        <div className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{value}</div>
      </div>
    </Card>
  );

  const active = detail ? detailConfigs[detail] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">لوحة التحكم</h2>
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-sm">
          <button onClick={() => setMode("month")} className={`px-3 py-1.5 rounded-md ${mode === "month" ? "bg-white dark:bg-slate-900 shadow font-semibold" : ""}`}>شهري</button>
          <button onClick={() => setMode("year")} className={`px-3 py-1.5 rounded-md ${mode === "year" ? "bg-white dark:bg-slate-900 shadow font-semibold" : ""}`}>سنوي</button>
        </div>
      </div>
      <p className="text-xs text-slate-400 -mt-2">دوس على أي كارت لعرض التفاصيل اللي وراه</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stat("عدد العملاء", data.clients.length, "#173B5E", Users, "clients")}
        {stat("عدد الفواتير", invoicesScope.length, "#0ea5e9", FileText, "invoices")}
        {stat("إجمالي الفواتير", fmtMoney(totalInvoices), "#173B5E", Wallet, "invoices")}
        {stat("المحصّل", fmtMoney(collected), "#16a34a", CheckCircle2, "collected")}
        {stat("المعلّق", fmtMoney(pending), "#d97706", Clock, "pending")}
        {stat("إجمالي المصروفات", fmtMoney(totalExpenses), "#e11d48", Wallet, "expenses")}
        {stat("إقرارات متأخرة", lateDeclarations.length, "#C9A227", ClipboardCheck, "lateDeclarations")}
        {stat("مبالغ إقرارات متأخرة", fmtMoney(outstandingTotal), "#e11d48", Wallet, "outstandingAmounts")}
      </div>

      {active && (
        <DetailModal
          key={detail}
          title={active.title}
          columns={active.columns}
          rows={active.rows}
          totalLabel={active.totalLabel}
          totalValue={active.totalValue}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
