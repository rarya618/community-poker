"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) { setError("Name must be at least 2 characters"); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name.trim() });
      // Store name in RTDB for server-side use
      await set(ref(db, `users/${cred.user.uid}`), { name: name.trim(), email });
      router.replace("/lobby");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl mb-3">♣</div>
          <h1 className="text-3xl font-bold text-white">Community Poker</h1>
          <p className="mt-2 text-zinc-400">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl bg-white/5 border border-white/10 p-6">
          <Input label="Display name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your poker name" required />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-green-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
