"use client";
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Tab = "sign-in" | "sign-up" | "guest";

const TABS: { id: Tab; label: string }[] = [
  { id: "sign-in", label: "Sign in" },
  { id: "sign-up", label: "Sign up" },
  { id: "guest",   label: "Play as guest" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function switchTab(t: Tab) { setTab(t); setError(""); }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) { setError("Name must be at least 2 characters"); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await set(ref(db, `users/${cred.user.uid}`), { name: name.trim(), email });
      router.replace("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally { setLoading(false); }
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
    } finally { setLoading(false); }
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <header className="flex items-center px-6 py-[13px] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[22px] leading-none select-none" style={{ color: "var(--chip-gold)" }}>♠</span>
          <div className="flex flex-col leading-none gap-[3px]">
            <span className="font-mono text-[11px] tracking-[0.28em] text-zinc-500 uppercase">Community</span>
            <span className="font-mono text-[15px] tracking-[0.18em] text-white/90 uppercase">Poker</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-sm flex flex-col bg-neutral-900 border border-white/[0.06] rounded-lg px-8 py-8 h-[480px]">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-white/[0.06]">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`pb-3 text-sm transition-all duration-200 border-b-2 -mb-px ${i === 0 ? "pr-6" : "px-6"} ${
                  tab === t.id ? "text-white border-white" : "text-zinc-600 border-transparent hover:text-zinc-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "sign-in" && (
            <form onSubmit={handleSignIn} className="flex flex-col flex-1 gap-0 mt-2">
              <div className="flex flex-col gap-1 py-3">
                <span className="text-xs text-zinc-500">Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full" />
              </div>
              <div className="flex flex-col gap-1 py-3">
                <span className="text-xs text-zinc-500">Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full" />
              </div>
              {error && <p className="text-xs text-red-400/80 pt-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="mt-auto w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {tab === "sign-up" && (
            <form onSubmit={handleSignUp} className="flex flex-col flex-1 gap-0 mt-2">
              <div className="flex flex-col gap-1 py-3">
                <span className="text-xs text-zinc-500">Name</span>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your poker name" required autoFocus
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full" />
              </div>
              <div className="flex flex-col gap-1 py-3">
                <span className="text-xs text-zinc-500">Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full" />
              </div>
              <div className="flex flex-col gap-1 py-3">
                <span className="text-xs text-zinc-500">Password</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters" minLength={6} required
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full" />
              </div>
              {error && <p className="text-xs text-red-400/80 pt-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="mt-auto w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors">
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          {tab === "guest" && (
            <form onSubmit={handleGuest} className="flex flex-col flex-1 gap-0 mt-2">
              <div className="flex flex-col gap-1 py-3">
                <span className="text-xs text-zinc-500">Your name</span>
                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                  placeholder="Enter a name" required autoFocus
                  className="bg-transparent text-xl text-white focus:outline-none placeholder:text-zinc-700 w-full" />
              </div>
              {error && <p className="text-xs text-red-400/80 pt-2">{error}</p>}
              <button type="submit" disabled={loading || guestName.trim().length < 2}
                className="mt-auto w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors">
                {loading ? "Continuing…" : "Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
