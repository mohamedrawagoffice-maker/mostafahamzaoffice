import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";

export const metadata = {
  title: "مكتب الأستاذ مصطفى حمزة",
  description: "نظام إدارة مكتب محاسبة وضرائب",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
