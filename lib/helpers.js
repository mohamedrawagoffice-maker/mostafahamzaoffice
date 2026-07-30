import { MONTH_NAMES } from "./constants";

export const todayISO = () => new Date().toISOString().slice(0, 10);

// دايمًا بيرجع بصيغة DD/MM/YYYY بغض النظر عن لغة أو إعدادات المتصفح
export const fmtDate = (d) => {
  if (!d) return "-";
  const s = String(d);
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, day] = isoMatch;
    return `${day}/${m}/${y}`;
  }
  const dt = new Date(s);
  if (isNaN(dt)) return s;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

// يحوّل أي قيمة تاريخ جاية من ملف إكسل (رقم تسلسلي، كائن Date، أو نص DD/MM/YYYY) إلى صيغة YYYY-MM-DD
// الصيغة اللي محتاجها قاعدة البيانات فعليًا لتخزينها كتاريخ صحيح
export function excelToISODate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !isNaN(value)) {
    const y = value.getFullYear(), m = String(value.getMonth() + 1).padStart(2, "0"), d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "number") {
    // رقم تسلسلي من إكسل (يوم 1 = 1900-01-01 تقريبًا)
    const utcDays = Math.floor(value - 25569);
    const utcMs = utcDays * 86400 * 1000;
    const date = new Date(utcMs);
    const y = date.getUTCFullYear(), m = String(date.getUTCMonth() + 1).padStart(2, "0"), d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  return null;
}

export const fmtMoney = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج.م";
};

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const lastDayOfMonth = (year, monthIdx0) => new Date(year, monthIdx0 + 1, 0).toISOString().slice(0, 10);

/* ---------- منطق توليد الإقرارات ---------- */
// أول سنة إقرارات في النظام هي 2025 — أي عميل يتضاف الإقرارات بتاعته بتتولد من يناير 2025
const DECLARATIONS_START_YEAR = 2025;

export function generateDeclarationsForClient(client, statusMap) {
  const out = [];
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = DECLARATIONS_START_YEAR; y <= currentYear + 1; y++) years.push(y);

  years.forEach((y) => {
    const deadline = client.entity_type === "شركة" ? `${y}-04-30` : `${y}-03-31`;
    const keyIncome = `${client.id}|دخل|${y}`;
    out.push({
      key: keyIncome, clientId: client.id, clientName: client.name, entityType: client.entity_type,
      type: "إقرار ضريبة الدخل السنوي", period: `سنة ${y}`, deadline,
      ...(statusMap[keyIncome] || {}),
    });

    if (client.vat_status === "نعم") {
      for (let m = 0; m < 12; m++) {
        const deadlineMonth = m === 11 ? 0 : m + 1;
        const deadlineYear = m === 11 ? y + 1 : y;
        const deadlineDate = lastDayOfMonth(deadlineYear, deadlineMonth);
        const keyVat = `${client.id}|ق م شهري|${y}-${m}`;
        out.push({
          key: keyVat, clientId: client.id, clientName: client.name, entityType: client.entity_type,
          type: "إقرار ضريبة القيمة المضافة", period: `${MONTH_NAMES[m]} ${y}`, deadline: deadlineDate,
          ...(statusMap[keyVat] || {}),
        });
      }
    } else if (client.vat_status === "ربع سنوي") {
      const quarters = [
        { deadline: `${y}-04-30`, label: `الربع الأول (يناير-مارس) ${y}` },
        { deadline: `${y}-07-30`, label: `الربع الثاني (إبريل-يونيو) ${y}` },
        { deadline: `${y}-10-30`, label: `الربع الثالث (يوليو-سبتمبر) ${y}` },
        { deadline: `${y + 1}-01-30`, label: `الربع الرابع (أكتوبر-ديسمبر) ${y}` },
      ];
      quarters.forEach((q, qi) => {
        const keyVat = `${client.id}|ق م ربع سنوي|${y}-${qi}`;
        out.push({
          key: keyVat, clientId: client.id, clientName: client.name, entityType: client.entity_type,
          type: "إقرار ضريبة القيمة المضافة (ربع سنوي)", period: q.label, deadline: q.deadline,
          ...(statusMap[keyVat] || {}),
        });
      });
    }
  });
  return out;
}

// بيرجع الإقرارات من بداية 2025 وحتى نهاية الشهر الجاي —
// شامل: قيد الانتظار (اللي فتح ميعاد تقديمها بس لسه ما اتقفلش، زي إقرار يونيو طول شهر يوليو)، متأخرة، ومكتملة
// إقرارات لسه بعيدة (زي إقرار يوليو نفسه وإحنا لسه في يوليو) مش بتتعرض لحد ما يفتح ميعادها
export function generateAllDeclarations(clients, statusMap) {
  const all = clients.flatMap((c) => generateDeclarationsForClient(c, statusMap));
  const today = todayISO();
  const now = new Date();
  const endOfWindow = lastDayOfMonth(now.getFullYear(), now.getMonth());
  return all
    .map((d) => {
      let status = "قيد الانتظار";
      if (d.completed) status = "مكتمل";
      else if (d.deadline < today) status = "متأخر";
      return { ...d, status };
    })
    .filter((d) => d.deadline <= endOfWindow);
}

// المتبقي على العميل لإقرار معين، حسب حالة السداد المختارة
export function declarationRemaining(d) {
  const amount = Number(d.amount) || 0;
  if (d.fully_paid === "كامل" || d.fully_paid === "صفري") return 0;
  if (d.fully_paid === "جزء") return Math.max(amount - (Number(d.paid_amount) || 0), 0);
  return amount; // لسه معملوش أي حاجة بخصوص السداد
}

// المبلغ المدفوع فعليًا على إقرار معين
export function declarationPaid(d) {
  const amount = Number(d.amount) || 0;
  if (d.fully_paid === "كامل") return amount;
  if (d.fully_paid === "صفري") return 0;
  if (d.fully_paid === "جزء") return Number(d.paid_amount) || 0;
  return 0;
}

/* ---------- تذكيرات العملاء ---------- */
export function buildReminders(clients) {
  const today = todayISO();
  const items = [];
  clients.forEach((c) => {
    const dates = [
      ...(c.card_expiry_date ? [{ type: "انتهاء البطاقة الضريبية", date: c.card_expiry_date }] : []),
      ...(c.important_dates || []),
    ];
    dates.forEach((d) => {
      if (!d.date) return;
      const diff = daysBetween(today, d.date);
      if (diff <= 14) items.push({ clientName: c.name, phone: c.phone, type: d.type, date: d.date, diff });
    });
  });
  items.sort((a, b) => a.diff - b.diff);
  return items;
}

export function sortRows(rows, sort) {
  if (!sort.key) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    let av = a[sort.key], bv = b[sort.key];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}
