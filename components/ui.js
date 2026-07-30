"use client";
import { useState } from "react";
import { X, Copy, Check, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

export const Card = ({ children, className = "", ...rest }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`} {...rest}>{children}</div>
);

export const Btn = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const styles = {
    primary: "bg-navy hover:bg-navyDark text-white",
    gold: "bg-gold hover:brightness-90 text-white",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    subtle: "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

export const Input = ({ label, className = "", ...props }) => (
  <label className="flex flex-col gap-1 text-sm">
    {label && <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>}
    <input {...props} className={`px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy ${className}`} />
  </label>
);

export const Select = ({ label, children, className = "", ...props }) => (
  <label className="flex flex-col gap-1 text-sm">
    {label && <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>}
    <select {...props} className={`px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy ${className}`}>
      {children}
    </select>
  </label>
);

export const TextArea = ({ label, className = "", ...props }) => (
  <label className="flex flex-col gap-1 text-sm">
    {label && <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>}
    <textarea {...props} className={`px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy ${className}`} />
  </label>
);

export const Badge = ({ children, color = "slate" }) => {
  const colors = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    gold: "bg-gold/15 text-[#8a6f1a] dark:text-[#e3c65a]",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>{children}</span>;
};

export const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export function CopyableCell({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-slate-400">-</span>;
  return (
    <button
      className="inline-flex items-center gap-1 hover:text-navy dark:hover:text-[#e3c65a] group"
      onClick={async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch (err) {} }}
      title="نسخ">
      <span>{value}</span>
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} className="opacity-0 group-hover:opacity-60" />}
    </button>
  );
}

export function SortableTh({ label, sortKey, sort, setSort }) {
  const active = sort.key === sortKey;
  return (
    <th className="px-3 py-2 text-right cursor-pointer select-none whitespace-nowrap"
      onClick={() => setSort((s) => ({ key: sortKey, dir: s.key === sortKey && s.dir === "asc" ? "desc" : "asc" }))}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={12} className="opacity-30" />}
      </span>
    </th>
  );
}
