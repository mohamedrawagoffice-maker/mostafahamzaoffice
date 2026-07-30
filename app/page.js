"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { defaultRouteForRole } from "../lib/constants";

export default function Home() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(profile ? defaultRouteForRole(profile.role) : "/login");
  }, [loading, profile, router]);

  return <div className="min-h-screen flex items-center justify-center text-slate-500">جاري التحميل...</div>;
}
