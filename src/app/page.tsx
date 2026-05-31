"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/lobby");
    else router.replace("/login");
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-neutral-950">
      <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );
}
