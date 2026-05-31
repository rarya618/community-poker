"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <header className="flex items-center px-6 py-4 border-b border-white/[0.06]">
        <span className="font-mono text-white text-sm">Community Poker</span>
      </header>

      <div className="flex flex-1 items-center justify-center px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-0 bg-neutral-900 border border-white/[0.06] rounded-lg px-6 py-2">
          <div className="flex flex-col gap-1.5 py-5 border-b border-white/[0.06]">
            <span className="text-xs text-zinc-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5 py-5 border-b border-white/[0.06]">
            <span className="text-xs text-zinc-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full"
            />
          </div>

          {error && <p className="text-xs text-red-400/80 pt-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 mb-6 w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="pb-6 text-center text-xs text-zinc-600">
            No account?{" "}
            <Link href="/signup" className="text-zinc-400 hover:text-white transition-colors">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
