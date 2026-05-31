"use client";
import { useState } from "react";
import { signInWithEmailAndPassword, signInAnonymously, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"sign-in" | "guest">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
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

  async function handleGuest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (guestName.trim().length < 2) { setError("Name must be at least 2 characters"); return; }
    setLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      await updateProfile(cred.user, { displayName: guestName.trim() });
      await set(ref(db, `users/${cred.user.uid}`), { name: guestName.trim() });
      router.replace("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue as guest");
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
        <div className="w-full max-w-xs flex flex-col gap-0 bg-neutral-900 border border-white/[0.06] rounded-lg px-6 py-2">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-white/[0.06] mb-2 mt-4">
            <button
              onClick={() => { setTab("sign-in"); setError(""); }}
              className={`pb-3 pr-6 text-sm transition-colors border-b-2 -mb-px ${tab === "sign-in" ? "text-white border-white" : "text-zinc-600 border-transparent hover:text-zinc-400"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setTab("guest"); setError(""); }}
              className={`pb-3 px-6 text-sm transition-colors border-b-2 -mb-px ${tab === "guest" ? "text-white border-white" : "text-zinc-600 border-transparent hover:text-zinc-400"}`}
            >
              Play as guest
            </button>
          </div>

          {tab === "sign-in" ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-0">
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
          ) : (
            <form onSubmit={handleGuest} className="flex flex-col gap-0">
              <div className="flex flex-col gap-1.5 py-5 border-b border-white/[0.06]">
                <span className="text-xs text-zinc-500">Your name</span>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Enter a name"
                  required
                  autoFocus
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full"
                />
              </div>

              {error && <p className="text-xs text-red-400/80 pt-4">{error}</p>}

              <button
                type="submit"
                disabled={loading || guestName.trim().length < 2}
                className="mt-6 mb-6 w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors"
              >
                {loading ? "Continuing…" : "Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
