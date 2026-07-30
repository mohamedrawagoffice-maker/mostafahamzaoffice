"use client";
import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { Bell, Search, Download, Upload, Plus, Edit2, Trash2, Paperclip, X } from "lucide-react";
import { useData } from "../../../lib/DataContext";
import { Card, Btn, Input, Select, TextArea, Badge, Modal, CopyableCell, SortableTh } from "../../../components/ui";
import { fmtDate, buildReminders, sortRows, excelToISODate, daysBetween, todayISO } from "../../../lib/helpers";
import { IMPORTANT_DATE_TYPES } from "../../../lib/constants";

const emptyClient = () => ({
  name: "", tax_number: "", national_id: "", entity_type: "فردي", vat_status: "لا",
  reg_date: "", card_expiry_date: "", username: "", password: "", phone: "", email: "",
  einvoice_email: "", einvoice_password: "", important_dates: [], notes: "", attachments: [],
});

function ClientForm({ initial, onSave, onCancel }) {
  const [c, setC] = useState(initial);
  const set = (k, v) => setC((p) => ({ ...p, [k]: v }));

  const addImportantDate = () => set("important_dates", [...(c.important_dates || []), { type: IMPORTANT_DATE_TYPES[0], date: "" }]);
  const updateImportantDate = (idx, key, val) => {
    const arr = [...c.important_dates];
    arr[idx] = { ...arr[idx], [key]: val };
    set("important_dates", arr);
  };
  const removeImportantDate = (idx) => set("important_dates", c.important_dates.filter((_, i) => i !== idx));

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      if (f.size > 3 * 1024 * 1024) { alert(`الملف ${f.name} كبير جدًا (الحد الأقصى 3MB)`); continue; }
      const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
      set("attachments", [...(c.attachments || []), { id: Date.now() + Math.random(), name: f.name, dataUrl }]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="الاسم *" value={c.name} onChange={(e) => set("name", e.target.value)} required />
        <Input label="الرقم الضريبي" value={c.tax_number || ""} onChange={(e) => set("tax_number", e.target.value)} />
        <Input label="الرقم القومي" value={c.national_id || ""} onChange={(e) => set("national_id", e.target.value)} />
        <Select label="نوع المنشأة" value={c.entity_type} onChange={(e) => set("entity_type", e.target.value)}>
          <option value="فردي">فردي</option><option value="شركة">شركة</option>
        </Select>
        <Select label="ق.م (القيمة المضافة)" value={c.vat_status} onChange={(e) => set("vat_status", e.target.value)}>
          <option value="لا">لا</option><option value="نعم">نعم (شهري)</option><option value="ربع سنوي">ربع سنوي</option>
        </Select>
        <Input label="تاريخ التسجيل" type="date" value={c.reg_date || ""} onChange={(e) => set("reg_date", e.target.value)} />
        <Input label="تاريخ انتهاء البطاقة الضريبية" type="date" value={c.card_expiry_date || ""} onChange={(e) => set("card_expiry_date", e.target.value)} />
        <Input label="رقم التليفون" value={c.phone || ""} onChange={(e) => set("phone", e.target.value)} />
        <Input label="الإيميل" value={c.email || ""} onChange={(e) => set("email", e.target.value)} />
        <Input label="اسم المستخدم (موقع الضرائب)" value={c.username || ""} onChange={(e) => set("username", e.target.value)} />
        <Input label="كلمة السر (موقع الضرائب)" value={c.password || ""} onChange={(e) => set("password", e.target.value)} />
        <Input label="إيميل الفاتورة الإلكترونية" value={c.einvoice_email || ""} onChange={(e) => set("einvoice_email", e.target.value)} />
        <Input label="كلمة سر الفاتورة الإلكترونية" value={c.einvoice_password || ""} onChange={(e) => set("einvoice_password", e.target.value)} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">تواريخ هامة (تظهر في التذكيرات)</span>
          <Btn variant="subtle" onClick={addImportantDate}><Plus size={14} /> إضافة تاريخ</Btn>
        </div>
        <div className="flex flex-col gap-2">
          {(c.important_dates || []).map((d, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Select value={d.type} onChange={(e) => updateImportantDate(idx, "type", e.target.value)} className="flex-1">
                {IMPORTANT_DATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input type="date" value={d.date} onChange={(e) => updateImportantDate(idx, "date", e.target.value)} className="flex-1" />
              <button onClick={() => removeImportantDate(idx)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      <TextArea label="ملاحظات" value={c.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={3} />

      <div>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 block mb-2">المرفقات (صور البطاقة، PDF) — حد أقصى 3MB لكل ملف</span>
        <input type="file" multiple onChange={handleFile} className="text-sm" />
        <div className="flex flex-wrap gap-2 mt-2">
          {(c.attachments || []).map((a) => (
            <span key={a.id} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-xs">
              <Paperclip size={12} /> {a.name}
              <button onClick={() => set("attachments", c.attachments.filter((x) => x.id !== a.id))}><X size={12} /></button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <Btn variant="ghost" onClick={onCancel}>إلغاء</Btn>
        <Btn onClick={() => c.name.trim() && onSave(c)}>حفظ العميل</Btn>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const data = useData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [modal, setModal] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const importRef = useRef();

  const reminders = useMemo(() => buildReminders(data.clients), [data.clients]);
  const filtered = data.clients.filter((c) =>
    [c.name, c.tax_number, c.national_id, c.phone, c.email].some((f) => (f || "").toLowerCase().includes(query.toLowerCase()))
  );
  const rows = sortRows(filtered, sort);

  const saveClient = async (c) => {
    if (modal.mode === "add") await data.addClient(c);
    else await data.updateClient(c);
    setModal(null);
  };

  const deleteClient = async (c) => {
    if (!confirm(`هل تريد حذف العميل "${c.name}"؟`)) return;
    await data.deleteClient(c);
  };

  const findImportantDate = (c, type) => (c.important_dates || []).find((d) => d.type === type)?.date || "";

  const exportExcel = () => {
    const rows = data.clients.map((c) => ({
      "الاسم": c.name, "الرقم الضريبي": c.tax_number, "الرقم القومي": c.national_id,
      "نوع المنشأة": c.entity_type, "ق.م": c.vat_status, "تاريخ التسجيل": c.reg_date,
      "تاريخ انتهاء البطاقة": c.card_expiry_date,
      "تاريخ انتهاء اشتراك موقع الضرائب": findImportantDate(c, "انتهاء اشتراك موقع الضرائب"),
      "تاريخ انتهاء التوكن": findImportantDate(c, "انتهاء التوكن"),
      "تاريخ لجان الطعن": findImportantDate(c, "لجان الطعن"),
      "اسم المستخدم": c.username, "كلمة السر": c.password,
      "التليفون": c.phone, "الإيميل": c.email, "إيميل الفاتورة الإلكترونية": c.einvoice_email,
      "كلمة سر الفاتورة الإلكترونية": c.einvoice_password, "ملاحظات": c.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العملاء");
    XLSX.writeFile(wb, "عملاء_مكتب_مصطفى_حمزة.xlsx");
  };

  const norm = (s) => (s || "").toString().trim().toLowerCase();
  const findDuplicate = (newClient) => data.clients.find((existing) =>
    (newClient.name && norm(existing.name) === norm(newClient.name)) ||
    (newClient.tax_number && norm(existing.tax_number) === norm(newClient.tax_number)) ||
    (newClient.national_id && norm(existing.national_id) === norm(newClient.national_id))
  );
  const duplicateReason = (newClient, existing) => {
    if (newClient.tax_number && norm(existing.tax_number) === norm(newClient.tax_number)) return "رقم ضريبي مكرر";
    if (newClient.national_id && norm(existing.national_id) === norm(newClient.national_id)) return "رقم قومي مكرر";
    return "اسم مكرر";
  };

  const [importReview, setImportReview] = useState(null); // { unique: [...], duplicates: [{row, existing, reason}] }

  const importExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { raw: true });
    const newClients = json.filter((r) => r["الاسم"] && r["الاسم"] !== "مثال: شركة النور للتجارة").map((r) => {
      const importantDates = [];
      const addIfPresent = (type, cell) => {
        const iso = excelToISODate(r[cell]);
        if (iso) importantDates.push({ type, date: iso });
      };
      addIfPresent("انتهاء اشتراك موقع الضرائب", "تاريخ انتهاء اشتراك موقع الضرائب");
      addIfPresent("انتهاء التوكن", "تاريخ انتهاء التوكن");
      addIfPresent("لجان الطعن", "تاريخ لجان الطعن");
      return {
        ...emptyClient(),
        name: r["الاسم"] || "", tax_number: String(r["الرقم الضريبي"] || ""), national_id: String(r["الرقم القومي"] || ""),
        entity_type: r["نوع المنشأة (فردي/شركة)"] || r["نوع المنشأة"] || "فردي",
        vat_status: r["ق.م (نعم/لا/ربع سنوي)"] || r["ق.م"] || "لا",
        reg_date: excelToISODate(r["تاريخ التسجيل"]), card_expiry_date: excelToISODate(r["تاريخ انتهاء البطاقة"]),
        username: r["اسم المستخدم"] || "", password: r["كلمة السر"] || "",
        phone: String(r["التليفون"] || ""), email: r["الإيميل"] || "",
        einvoice_email: r["إيميل الفاتورة الإلكترونية"] || "", einvoice_password: r["كلمة سر الفاتورة الإلكترونية"] || "",
        important_dates: importantDates,
        notes: r["ملاحظات"] || "",
      };
    });

    const unique = [];
    const duplicates = [];
    newClients.forEach((row) => {
      const existing = findDuplicate(row);
      if (existing) duplicates.push({ row, existing, reason: duplicateReason(row, existing), include: false });
      else unique.push(row);
    });

    if (duplicates.length === 0) {
      if (unique.length) await data.importClients(unique);
    } else {
      setImportReview({ unique, duplicates });
    }
    e.target.value = "";
  };

  const confirmImportReview = async () => {
    const toInclude = importReview.duplicates.filter((d) => d.include).map((d) => d.row);
    const all = [...importReview.unique, ...toInclude];
    if (all.length) await data.importClients(all);
    setImportReview(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">العملاء</h2>
        <div className="flex gap-2 flex-wrap">
          <a href="/client-import-template.xlsx" download>
            <Btn variant="subtle"><Download size={15} /> نموذج فارغ</Btn>
          </a>
          <label className="cursor-pointer">
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={importExcel} />
            <span onClick={() => importRef.current?.click()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 cursor-pointer"><Upload size={15} /> استيراد</span>
          </label>
          <Btn variant="subtle" onClick={exportExcel}><Download size={15} /> تصدير Excel</Btn>
          <Btn onClick={() => setModal({ mode: "add", client: emptyClient() })}><Plus size={16} /> إضافة عميل</Btn>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={18} className="text-gold" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">التذكيرات (خلال 14 يوم أو متأخرة)</h3>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm text-slate-400">لا يوجد تذكيرات حالياً.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr><th className="px-2 py-1.5 text-right">العميل</th><th className="px-2 py-1.5 text-right">التليفون</th><th className="px-2 py-1.5 text-right">نوع التذكير</th><th className="px-2 py-1.5 text-right">التاريخ</th><th className="px-2 py-1.5 text-right">الحالة</th></tr>
              </thead>
              <tbody>
                {reminders.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="px-2 py-1.5 font-medium">{r.clientName}</td>
                    <td className="px-2 py-1.5"><CopyableCell value={r.phone} /></td>
                    <td className="px-2 py-1.5">{r.type}</td>
                    <td className="px-2 py-1.5">{fmtDate(r.date)}</td>
                    <td className="px-2 py-1.5">
                      {r.diff < 0 ? <Badge color="red">متأخر {Math.abs(r.diff)} يوم</Badge> : r.diff === 0 ? <Badge color="amber">اليوم</Badge> : <Badge color="amber">باقي {r.diff} يوم</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالاسم أو الرقم الضريبي أو التليفون..."
          className="w-full pr-9 pl-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-navy" />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
            <tr>
              <SortableTh label="الاسم" sortKey="name" sort={sort} setSort={setSort} />
              <SortableTh label="الرقم الضريبي" sortKey="tax_number" sort={sort} setSort={setSort} />
              <SortableTh label="نوع المنشأة" sortKey="entity_type" sort={sort} setSort={setSort} />
              <SortableTh label="ق.م" sortKey="vat_status" sort={sort} setSort={setSort} />
              <th className="px-3 py-2 text-right">التليفون</th>
              <th className="px-3 py-2 text-right">الإيميل</th>
              <th className="px-3 py-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 font-medium cursor-pointer text-navy dark:text-[#e3c65a]" onClick={() => setViewClient(c)}>{c.name}</td>
                <td className="px-3 py-2"><CopyableCell value={c.tax_number} /></td>
                <td className="px-3 py-2">{c.entity_type}</td>
                <td className="px-3 py-2">{c.vat_status}</td>
                <td className="px-3 py-2"><CopyableCell value={c.phone} /></td>
                <td className="px-3 py-2"><CopyableCell value={c.email} /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ mode: "edit", client: c })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => deleteClient(c)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">لا يوجد عملاء</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "add" ? "إضافة عميل جديد" : "تعديل بيانات العميل"} wide>
        {modal && <ClientForm initial={modal.client} onSave={saveClient} onCancel={() => setModal(null)} />}
      </Modal>

      <Modal open={!!viewClient} onClose={() => setViewClient(null)} title={viewClient?.name || ""} wide>
        {viewClient && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ["الرقم الضريبي", viewClient.tax_number], ["الرقم القومي", viewClient.national_id],
              ["نوع المنشأة", viewClient.entity_type], ["ق.م", viewClient.vat_status],
              ["تاريخ التسجيل", fmtDate(viewClient.reg_date)], ["تاريخ انتهاء البطاقة", fmtDate(viewClient.card_expiry_date)],
              ["التليفون", viewClient.phone], ["الإيميل", viewClient.email],
              ["اسم المستخدم", viewClient.username], ["كلمة السر", viewClient.password],
              ["إيميل الفاتورة الإلكترونية", viewClient.einvoice_email], ["كلمة سر الفاتورة الإلكترونية", viewClient.einvoice_password],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-slate-100 dark:border-slate-700/50 py-1.5">
                <span className="text-slate-500">{l}</span><CopyableCell value={v} />
              </div>
            ))}
            {viewClient.notes && <div className="col-span-2 pt-2"><span className="text-slate-500 block mb-1">ملاحظات</span>{viewClient.notes}</div>}
            {(viewClient.important_dates || []).length > 0 && (
              <div className="col-span-2 pt-2">
                <span className="text-slate-500 block mb-2">تواريخ هامة</span>
                <div className="flex flex-col gap-1.5">
                  {viewClient.important_dates.map((d, idx) => {
                    const diff = daysBetween(todayISO(), d.date);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 rounded-lg px-2.5 py-1.5">
                        <span>{d.type}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-slate-500">{fmtDate(d.date)}</span>
                          {d.date && (diff < 0 ? <Badge color="red">متأخر {Math.abs(diff)} يوم</Badge> : diff <= 14 ? <Badge color="amber">باقي {diff} يوم</Badge> : null)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(viewClient.attachments || []).length > 0 && (
              <div className="col-span-2 pt-2">
                <span className="text-slate-500 block mb-1">المرفقات</span>
                <div className="flex flex-wrap gap-2">
                  {viewClient.attachments.map((a) => (
                    <a key={a.id} href={a.dataUrl} download={a.name} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-xs hover:bg-slate-200"><Paperclip size={12} />{a.name}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!importReview} onClose={() => setImportReview(null)} title="بيانات مكررة في ملف الاستيراد" wide>
        {importReview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {importReview.unique.length > 0 && <>هيتم استيراد <b>{importReview.unique.length}</b> عميل جديد من غير تكرار. </>}
              لاقينا <b>{importReview.duplicates.length}</b> صف عليه تكرار مع عملاء موجودين بالفعل — حدد اللي عايز تضيفه رغم التكرار:
            </p>
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                  <tr>
                    <th className="px-2 py-2 text-right">إضافة؟</th>
                    <th className="px-2 py-2 text-right">اسم الصف المستورد</th>
                    <th className="px-2 py-2 text-right">تكرار مع (العميل الموجود)</th>
                    <th className="px-2 py-2 text-right">سبب التكرار</th>
                  </tr>
                </thead>
                <tbody>
                  {importReview.duplicates.map((d, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="px-2 py-1.5">
                        <input type="checkbox" checked={d.include} className="w-4 h-4 accent-navy"
                          onChange={(e) => setImportReview((prev) => {
                            const next = { ...prev, duplicates: [...prev.duplicates] };
                            next.duplicates[idx] = { ...next.duplicates[idx], include: e.target.checked };
                            return next;
                          })} />
                      </td>
                      <td className="px-2 py-1.5 font-medium">{d.row.name}</td>
                      <td className="px-2 py-1.5 text-slate-500">{d.existing.name}</td>
                      <td className="px-2 py-1.5"><Badge color="amber">{d.reason}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <button className="text-xs text-navy dark:text-[#e3c65a] hover:underline" onClick={() => setImportReview((p) => ({ ...p, duplicates: p.duplicates.map((d) => ({ ...d, include: true })) }))}>تحديد الكل</button>
                <button className="text-xs text-slate-500 hover:underline" onClick={() => setImportReview((p) => ({ ...p, duplicates: p.duplicates.map((d) => ({ ...d, include: false })) }))}>إلغاء تحديد الكل</button>
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => setImportReview(null)}>إلغاء الاستيراد بالكامل</Btn>
                <Btn onClick={confirmImportReview}>تأكيد الاستيراد</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
