"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { DEFAULT_EXPENSE_CATEGORIES } from "./constants";

export function useOfficeData(profile) {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [declarationStatus, setDeclarationStatus] = useState({});
  const [settings, setSettings] = useState({ expense_categories: DEFAULT_EXPENSE_CATEGORIES, office_info: { name: "مكتب الأستاذ مصطفى حمزة" } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, i, t, dstatus, s, exp, log, prof, lv] = await Promise.allSettled([
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
      ]);

      const val = (r) => (r.status === "fulfilled" ? r.value : { data: null, error: r.reason });

      const cRes = val(c), iRes = val(i), tRes = val(t), dRes = val(dstatus), sRes = val(s), expRes = val(exp), logRes = val(log), profRes = val(prof), lvRes = val(lv);

      if (cRes.error || iRes.error || tRes.error) throw cRes.error || iRes.error || tRes.error;

      setClients(cRes.data || []);
      setInvoices(iRes.data || []);
      setTasks(tRes.data || []);
      if (!profRes.error) setProfiles(profRes.data || []);
      if (!lvRes.error) setLeaves(lvRes.data || []);
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
  const addClient = async (client) => {
    const { id, ...payload } = client;
    payload.created_by = profile.display_name;
    const { data, error } = await supabase.from("clients").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setClients((p) => [data, ...p]);
    logActivity("إضافة", "عميل", data.name);
    return data;
  };
  const updateClient = async (client) => {
    const { id, ...payload } = client;
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

  /* ---------------- Invoices ---------------- */
  const addInvoice = async (inv) => {
    const payload = { ...inv, created_by: profile.display_name };
    const { data, error } = await supabase.from("invoices").insert(payload).select().single();
    if (error) { setError(error.message); return null; }
    setInvoices((p) => [data, ...p]);
    logActivity("إضافة", "فاتورة", `${fmtRef(clients, data.client_id)} - ${data.amount}`);
    return data;
  };
  const updateInvoice = async (id, patch) => {
    const { data, error } = await supabase.from("invoices").update(patch).eq("id", id).select().single();
    if (error) { setError(error.message); return null; }
    setInvoices((p) => p.map((x) => (x.id === id ? data : x)));
    logActivity("تعديل", "فاتورة", `${fmtRef(clients, data.client_id)} - ${data.amount}`);
    return data;
  };
  const deleteInvoice = async (inv) => {
    const { error } = await supabase.from("invoices").delete().eq("id", inv.id);
    if (error) { setError(error.message); return; }
    setInvoices((p) => p.filter((x) => x.id !== inv.id));
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
    return data;
  };
  const updateTask = async (task, patch) => {
    const { data, error } = await supabase.from("tasks").update(patch).eq("id", task.id).select().single();
    if (error) { setError(error.message); return; }
    setTasks((p) => p.map((t) => (t.id === task.id ? data : t)));
    logActivity(patch.status || "إضافة ملاحظة على", "مهمة", task.text.slice(0, 40));
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
    setLeaves((p) => [data, ...p]);
    logActivity("تسجيل", "يوم أجازة", `${leave.user_name} - ${leave.date}`);
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
    clients, invoices, expenses, tasks, leaves, profiles, activityLog, declarationStatus, settings, loading, error, setError,
    reload: loadAll, logActivity,
    addClient, updateClient, deleteClient, importClients,
    addInvoice, deleteInvoice, updateInvoice,
    addExpense, deleteExpense,
    addTask, updateTask, deleteTask,
    addLeave, updateLeave, deleteLeave,
    upsertDeclaration,
    updateSettings,
    clearActivityLog,
  };
}

function fmtRef(clients, clientId) {
  return clients.find((c) => c.id === clientId)?.name || "—";
}
