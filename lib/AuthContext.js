"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null); // { id, username, display_name, role }
  const [loading, setLoading] = useState(true);
  const loadedUserIdRef = useRef(null); // آخر مستخدم اتحمل بروفايله فعليًا

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { loadedUserIdRef.current = null; setProfile(null); return; }
    // نفس المستخدم متسجل بالفعل (زي حالة تجديد الجلسة التلقائي أو رجوع التركيز للصفحة) —
    // مفيش داعي نعيد تحميل البروفايل وبالتالي نعيد تحميل كل بيانات المكتب من الأول
    if (loadedUserIdRef.current === userId) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!error) { loadedUserIdRef.current = userId; setProfile(data); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await loadProfile(session?.user?.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await loadProfile(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: "الإيميل أو كلمة المرور غير صحيحة" };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    setProfile(null);
  };

  return <AuthCtx.Provider value={{ profile, loading, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
