"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { sendNotification } from "./notifyClient";
import { DEFAULT_EXPENSE_CATEGORIES, LEAVE_ANNUAL_PAID_DAYS } from "./constants";
import { summarizeLeaveYear } from "./helpers";

export function useOfficeData(profile) {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [custody, setCustody] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [declarationStatus, setDeclarationStatus] = useState({});
  const [settings, setSettings] = useState({ expense_categories: DEFAULT_EXPENSE_CATEGORIES, office_info: { name: "مكتب الأستاذ مصطفى حمزة" } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, i, t, dstatus, s, exp, log, prof, lv, cust] = await Promise.allSettled([
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("invoices").select("*").order("date", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("declaration_status").select("*"),
        supabase.from("settings").select("*").eq("id", 1).single(),
        // قد تكون هذه الاستعلامات محجوبة بصلاحيات RLS للمحاسب/المتدرب — نتعامل معها بهدوء بالأسفل
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("activity_log").select("*").order("timestamp", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, username, display_name, role"),
        supabase.from("leaves").select("*").order("date", { ascending: false }),
        supabase.from("custody").select("*").order("date", { ascending: false }),
      ]);

      const val = (r) => (r.status === "fulfilled" ? r.value : { data: null, error: r.reason });

      const cRes = val(c), iRes = val(i), tRes = val(t), dRes = val(dstatus), sRes = val(s), expRes = val(exp), logRes = val(log), profRes = val(prof), lvRes = val(lv), custRes = val(cust);

      if (cRes.error || iRes.error || tRes.error) throw cRes.error || iRes.error || tRes.error;

      setClients(cRes.data || []);
      setInvoices(iRes.data || []);
      setTasks(tRes.data || []);
      if (!profRes.error) setProfiles(profRes.data || []);
      if (!lvRes.error) setLeaves(lvRes.data || []);
      if (!custRes.error) setCustody(custRes.data || []);
      const dsMap = {};
      (dRes.data || []).forEach((d) => { dsMap[d.key] = d; });
      setDeclarationStatus(dsMap);
      if (sRes.data) setSettings(sRes.data);
      if (!expRes.error) setExpenses(expRes.data || []);
      if (!logRes.error) setActivityLog(logRes.data || []);

      setError(null);
    } catch (e) {
      setError("تعذر تحميل البيانات من قاعدة البيانات. تأكد من إعداد Supabase بشكل صحيح.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (profile) loadAll(); }, [profile, loadAll]);

  const logActivity = useCallback(async (action, entity, details) => {
    if (!profile) return;
    const row = { actor: profile.display_name, action, entity, details };
    const { data } = await supabase.from("activity_log").insert(row).select().single();
    if (data) setActivityLog((prev) => [data, ...prev]);
  }, [profile]);

  /* ---------------- Clients ---------------- */
  // أعمدة التاريخ في قاعدة البيانات لازم تكون null أو تاريخ صحيح، مش نص فاضي ""
  const sanitizeClientPayload = (payload) => {
    const clean = { ...payload };
    if (clean.reg_date === "") clean.reg_date = null;
    if (clean.card_expiry_date === "") clean.card_expiry_date = null;
    if (Array.isArray(clean.important_dates)) {
      clean.important_dates = clean.important_dates.map((d) => ({ ...d, date: d.date || null }));
    }
    return clean;
  };
  const addClient = async (client) => {
    const { id, ...rest } = client;
    const payload = sanitizeClientPayload(rest);
    payload.created_by = profile.display_name;
    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setClients((p) => [data, ...p]);
    logActivity("إضافة", "عميل", data.name);
    return data;
  };
  const updateClient = async (client) => {
    const { id, ...rest } = client;
    const payload = sanitizeClientPayload(rest);
    const { data, error } = await supabase.from("clients").update(payload).eq("id", id).select().single();
    if (error) { setError(error.message); return null; }
    setClients((p) => p.map((c) => (c.id === id ? data : c)));
    logActivity("تعديل", "عميل", data.name);
    return data;
  };
  const deleteClient = async (client) => {
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) { setError(error.message); return; }
    setClients((p) => p.filter((c) => c.id !== client.id));
    logActivity("حذف", "عميل", client.name);
  };
  const importClients = async (rows) => {
    const payload = rows.map((r) => ({ ...r, created_by: profile.display_name }));
    const { data, error } = await supabase.from("clients").insert(payload).select();
    if (error) { setError(error.message); return; }
    setClients((p) => [...(data || []), ...p]);
    logActivity("استيراد", "عملاء", `${data?.length || 0} عميل`);
  };

  /* ---------------- Invoices (مربوطة بالعهدة لو مدفوعة) ---------------- */
  // بيحدد صاحب حركة العهدة حسب طريقة الدفع المختارة في الفاتورة
  const custodyTargetFor = (paymentMethod) => {
    if (paymentMethod === "عهدة شخصية") return { id: profile.id, name: profile.display_name };
    if (paymentMethod === "كارت مصطفى مباشر") {
      const mostafa = profiles.find((p) => p.display_name?.includes("مصطفى"));
      return mostafa ? { id: mostafa.id, name: mostafa.display_name } : null;
    }
    return null;
  };

  // بينشئ/يحدّث/يحذف حركة العهدة المرتبطة بالفاتورة حسب حالتها وطريقة الدفع الحالية
  const syncInvoiceCustody = async (invoice, existingCustodyRow) => {
    const shouldHaveCustody = invoice.status !== "معلقة" && !!invoice.payment_method;
    if (!shouldHaveCustody) {
      if (existingCustodyRow) {
        await supabase.from("custody").delete().eq("id", existingCustodyRow.id);
        setCustody((p) => p.filter((c) => c.id !== existingCustodyRow.id));
      }
      return;
    }
    const target = custodyTargetFor(invoice.payment_method);
    if (!target) return; // لو "كارت مصطفى مباشر" ومفيش حساب مصطفى متسجل، منقدرش نربط الحركة
    const rowPayload = {
      user_id: target.id, user_name: target.name, type: "دفع",
      amount: invoice.amount, date: invoice.date, client_id: invoice.client_id,
      client_name_manual: null, note: `دفعة فاتورة${invoice.description ? " - " + invoice.description : ""}`,
      invoice_id: invoice.id,
    };
    if (existingCustodyRow) {
      const { data, error } = await supabase.from("custody").update(rowPayload).eq("id", existingCustodyRow.id).select().single();
      if (!error) setCustody((p) => p.map((c) => (c.id === existingCustodyRow.id ? data : c)));
    } else {
      const { data, error } = await supabase.from("custody").insert({ ...rowPayload, created_by: profile.display_name }).select().single();
      if (!error) { setCustody((p) => [data, ...p]); notifyCustodyEvent(data); }
    }
  };

  const addInvoice = async (inv) => {
    const payload = { ...inv, created_by: profile.display_name };
    const { data, error } = await supabase.from("invoices").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setInvoices((p) => [data, ...p]);
    await syncInvoiceCustody(data, null);
    logActivity("إضافة", "فاتورة", `${fmtRef(clients, data.client_id)} - ${data.amount}`);
    return data;
  };
  const updateInvoice = async (id, patch) => {
    const { data, error } = await supabase.from("invoices").update(patch).eq("id", id).select().single();
    if (error) { setError(error.message); return null; }
    setInvoices((p) => p.map((x) => (x.id === id ? data : x)));
    const existingCustodyRow = custody.find((c) => c.invoice_id === id);
    await syncInvoiceCustody(data, existingCustodyRow);
    logActivity("تعديل", "فاتورة", `${fmtRef(clients, data.client_id)} - ${data.amount}`);
    return data;
  };
  const deleteInvoice = async (inv) => {
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) { setError(error.message); return; }
    setInvoices((p) => p.filter((x) => x.id !== inv.id));
    // حركة العهدة المرتبطة بيتم حذفها تلقائيًا في قاعدة البيانات (on delete cascade)، هنا بنحدث الحالة محليًا بس
    setCustody((p) => p.filter((c) => c.invoice_id !== inv.id));
    logActivity("حذف", "فاتورة", `${fmtRef(clients, inv.client_id)} - ${inv.amount}`);
  };

  /* ---------------- Expenses ---------------- */
  const addExpense = async (exp) => {
    const payload = { ...exp, created_by: profile.display_name };
    const { data, error } = await supabase.from("expenses").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setExpenses((p) => [data, ...p]);
    logActivity("إضافة", "مصروف", `${data.category} - ${data.amount}`);
    return data;
  };
  const deleteExpense = async (exp) => {
    const { error } = await supabase.from("expenses").delete().eq("id", exp.id);
    if (error) { setError(error.message); return; }
    setExpenses((p) => p.filter((x) => x.id !== exp.id));
    logActivity("حذف", "مصروف", `${exp.category} - ${exp.amount}`);
  };

  /* ---------------- Tasks ---------------- */
  const addTask = async (task) => {
    const payload = { ...task, from_user: profile.display_name, from_user_id: profile.id };
    const { data, error } = await supabase.from("tasks").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setTasks((p) => [data, ...p]);
    logActivity("إرسال", "مهمة", `إلى ${task.to_user}`);
    if (data.to_user_id && data.to_user_id !== profile.id) {
      sendNotification({ userIds: [data.to_user_id], title: "مهمة جديدة", body: `${profile.display_name}: ${data.text}`, url: "/tasks" });
    }
    return data;
  };
  const updateTask = async (task, patch) => {
    const { data, error } = await supabase.from("tasks").update(patch).eq("id", task.id).select().single();
    if (error) { setError(error.message); return; }
    setTasks((p) => p.map((t) => (t.id === task.id ? data : t)));
    logActivity(patch.status || "إضافة ملاحظة على", "مهمة", task.text.slice(0, 40));

    const shortText = task.text.length > 80 ? task.text.slice(0, 80) + "…" : task.text;
    if (patch.status === "تم العلم" && task.from_user_id && task.from_user_id !== profile.id) {
      sendNotification({
        userIds: [task.from_user_id], title: "تم العلم بالمهمة",
        body: `${profile.display_name} علّم بتنفيذ المهمة:\n"${shortText}"`, url: "/tasks",
      });
    } else if (patch.status === "معتمد التنفيذ" && task.to_user_id && task.to_user_id !== profile.id) {
      sendNotification({
        userIds: [task.to_user_id], title: "تم اعتماد تنفيذ مهمتك",
        body: `${profile.display_name} اعتمد تنفيذ المهمة:\n"${shortText}"`, url: "/tasks",
      });
    } else if ("note" in patch) {
      const others = [task.from_user_id, task.to_user_id].filter((id) => id && id !== profile.id);
      if (others.length > 0) {
        const noteText = (patch.note || "").trim();
        sendNotification({
          userIds: others, title: "ملاحظة جديدة على مهمة",
          body: `${profile.display_name} كتب ملاحظة على المهمة:\n"${shortText}"\n\nنص الملاحظة:\n"${noteText || "(بدون نص)"}"`,
          url: "/tasks",
        });
      }
    }
  };
  const deleteTask = async (task) => {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) { setError(error.message); return; }
    setTasks((p) => p.filter((t) => t.id !== task.id));
    logActivity("حذف", "مهمة", task.text.slice(0, 40));
  };

  /* ---------------- Leaves (رصيد الأجازات) ---------------- */
  const addLeave = async (leave) => {
    const payload = { ...leave, created_by: profile.display_name };
    const { data, error } = await supabase.from("leaves").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    const updatedLeaves = [data, ...leaves];
    setLeaves(updatedLeaves);
    logActivity("تسجيل", "يوم أجازة", `${leave.user_name} - ${leave.date}`);

    const year = new Date(data.date).getFullYear();
    const summary = summarizeLeaveYear(updatedLeaves, data.user_id, year, LEAVE_ANNUAL_PAID_DAYS);
    const managerIds = profiles.filter((p) => (p.role === "مدير" || p.role === "أدمن") && p.id !== profile.id).map((p) => p.id);
    const ownerIds = data.user_id && data.user_id !== profile.id ? [data.user_id] : [];
    const recipients = [...new Set([...managerIds, ...ownerIds])];
    if (recipients.length > 0) {
      sendNotification({
        userIds: recipients, title: "تسجيل يوم أجازة",
        body: `${profile.display_name} سجّل يوم أجازة لـ${data.user_name} بتاريخ ${data.date}.\nمتبقي له ${summary.remaining} يوم من أصل ${LEAVE_ANNUAL_PAID_DAYS} يوم مدفوعة في ${year}.${summary.unpaidCount > 0 ? `\n(${summary.unpaidCount} يوم من أيامه هتتخصم من الراتب لأنه تخطى الحد السنوي)` : ""}`,
        url: "/leaves",
      });
    }
    return data;
  };
  const updateLeave = async (leave, patch) => {
    const { data, error } = await supabase.from("leaves").update(patch).eq("id", leave.id).select().single();
    if (error) { setError(error.message); return; }
    setLeaves((p) => p.map((l) => (l.id === leave.id ? data : l)));
    logActivity("تعديل", "يوم أجازة", `${leave.user_name} - ${leave.date}`);
  };
  const deleteLeave = async (leave) => {
    const { error } = await supabase.from("leaves").delete().eq("id", leave.id);
    if (error) { setError(error.message); return; }
    setLeaves((p) => p.filter((l) => l.id !== leave.id));
    logActivity("حذف", "يوم أجازة", `${leave.user_name} - ${leave.date}`);
  };

  /* ---------------- Custody (العهدة) ---------------- */
  // بيبعت إشعار للمدير/الأدمن دايمًا، وللشخص صاحب العهدة لو مختلف عن اللي بيسجل الحركة
  const notifyCustodyEvent = (entry) => {
    const managerIds = profiles.filter((p) => (p.role === "مدير" || p.role === "أدمن") && p.id !== profile.id).map((p) => p.id);
    const targetIds = entry.user_id && entry.user_id !== profile.id ? [entry.user_id] : [];
    const recipients = [...new Set([...managerIds, ...targetIds])];
    if (recipients.length === 0) return;
    const label = entry.type === "دفع" ? "دفعة من العهدة" : entry.type === "تحصيل من عميل" ? "تحصيل من عميل" : entry.type;
    const clientName = entry.client_id ? clients.find((c) => c.id === entry.client_id)?.name : entry.client_name_manual;
    const lines = [
      `${profile.display_name} سجّل ${label} بمبلغ ${entry.amount} على عهدة ${entry.user_name}`,
      `التاريخ: ${entry.date}`,
    ];
    if (clientName) lines.push(`العميل: ${clientName}`);
    if (entry.note) lines.push(`ملاحظة: ${entry.note}`);
    sendNotification({ userIds: recipients, title: `حركة عهدة: ${label}`, body: lines.join("\n"), url: "/custody" });
  };
  const addCustody = async (entry) => {
    const payload = { ...entry, created_by: profile.display_name };
    const { data, error } = await supabase.from("custody").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setCustody((p) => [data, ...p]);
    const label = data.type === "دفع"
      ? `دفعة ${data.amount} - ${data.user_name}`
      : `${data.type} ${data.amount} - ${data.user_name}`;
    logActivity(data.type, "عهدة", label);
    notifyCustodyEvent(data);
    return data;
  };
  const deleteCustody = async (entry) => {
    const { error } = await supabase.from("custody").delete().eq("id", entry.id);
    if (error) { setError(error.message); return; }
    setCustody((p) => p.filter((c) => c.id !== entry.id));
    logActivity("حذف", "عهدة", `${entry.type} ${entry.amount} - ${entry.user_name}`);
  };

  /* ---------------- Profiles (بيانات المستخدمين) ---------------- */
  const updateProfile = async (id, patch) => {
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select().single();
    if (error) { setError(error.message); return null; }
    setProfiles((p) => p.map((x) => (x.id === id ? data : x)));
    return data;
  };

  /* ---------------- Declaration status ---------------- */
  const upsertDeclaration = async (key, patch, clientId) => {
    const payload = { key, client_id: clientId, ...(declarationStatus[key] || {}), ...patch };
    delete payload.status; // computed field, not stored
    const { data, error } = await supabase.from("declaration_status").upsert(payload).select().single();
    if (error) { setError(error.message); return; }
    setDeclarationStatus((p) => ({ ...p, [key]: data }));
  };

  /* ---------------- Settings ---------------- */
  const updateSettings = async (patch) => {
    const { data, error } = await supabase.from("settings").update(patch).eq("id", 1).select().single();
    if (error) { setError(error.message); return; }
    setSettings(data);
    logActivity("تعديل", "الإعدادات", "");
  };

  /* ---------------- Activity log ---------------- */
  const clearActivityLog = async () => {
    const { error } = await supabase.from("activity_log").delete().not("id", "is", null);
    if (error) { setError(error.message); return; }
    const { data: newEntry } = await supabase
      .from("activity_log")
      .insert({ actor: profile.display_name, action: "مسح", entity: "سجل النشاط", details: "" })
      .select().single();
    setActivityLog(newEntry ? [newEntry] : []);
  };

  return {
    clients, invoices, expenses, tasks, leaves, custody, profiles, activityLog, declarationStatus, settings, loading, error, setError,
    reload: loadAll, logActivity,
    addClient, updateClient, deleteClient, importClients,
    addInvoice, deleteInvoice, updateInvoice,
    addExpense, deleteExpense,
    addTask, updateTask, deleteTask,
    addLeave, updateLeave, deleteLeave,
    addCustody, deleteCustody,
    updateProfile,
    upsertDeclaration,
    updateSettings,
    clearActivityLog,
  };
}

function fmtRef(clients, clientId) {
  return clients.find((c) => c.id === clientId)?.name || "—";
}
