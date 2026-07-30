"use client";
import { useState, useMemo } from "react";
import { Printer } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Input, SortableTh } from "../../../components/ui";
import { fmtMoney, sortRows, todayISO } from "../../../lib/helpers";

const COLORS = ["#173B5E", "#C9A227", "#0ea5e9", "#e11d48", "#16a34a", "#8b5cf6", "#f97316", "#64748b"];

export default function ReportsPage() {
  const data = useData();
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());
  const [sort, setSort] = useState({ key: "value", dir: "desc" });

  const inRange = (d) => d && d >= from && d <= to;
  const invoicesR = data.invoices.filter((i) => inRange(i.date));
  const expensesR = data.expenses.filter((e) => inRange(e.date));
  const clientsR = data.clients.filter((c) => inRange((c.created_at || "").slice(0, 10)));

  const totalInvoices = invoicesR.reduce((s, i) => s + Number(i.amount || 0), 0);
  const collected = invoicesR.filter((i) => i.status === "مدفوعة").reduce((s, i) => s + Number(i.amount || 0), 0);
  const pending = totalInvoices - collected;
  const totalExpenses = expensesR.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = collected - totalExpenses;

  const byCategory = useMemo(() => {
    const map = {};
    expensesR.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expensesR]);

  const rows = sortRows(byCategory, sort);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">التقارير</h2>
        <Btn variant="subtle" onClick={() => window.print()}><Printer size={15} /> طباعة</Btn>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <Input label="من تاريخ" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="إلى تاريخ" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["عدد الفواتير", invoicesR.length], ["عملاء جدد", clientsR.length],
          ["إجمالي الفواتير", fmtMoney(totalInvoices)], ["المحصّل", fmtMoney(collected)],
          ["المعلّق", fmtMoney(pending)], ["إجمالي المصروفات", fmtMoney(totalExpenses)],
          ["صافي الربح", fmtMoney(netProfit)],
        ].map(([l, v]) => (
          <Card key={l} className="p-4">
            <div className="text-slate-500 dark:text-slate-400 text-xs">{l}</div>
            <div className="font-bold text-lg mt-1 text-slate-800 dark:text-slate-100">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="font-bold mb-3 text-slate-800 dark:text-slate-100">توزيع المصروفات حسب التصنيف</h3>
        {byCategory.length === 0 ? <p className="text-sm text-slate-400">لا يوجد بيانات في هذه الفترة</p> : (
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {byCategory.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr><SortableTh label="التصنيف" sortKey="name" sort={sort} setSort={setSort} /><SortableTh label="المبلغ" sortKey="value" sort={sort} setSort={setSort} /></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 dark:border-slate-700/50"><td className="px-3 py-1.5">{r.name}</td><td className="px-3 py-1.5">{fmtMoney(r.value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
