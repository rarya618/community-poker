"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/hooks/useApiCall";
import { GameVariant } from "@/lib/poker/types";

export default function LobbyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [variant, setVariant] = useState<GameVariant>("holdem");
  const [startingChips, setStartingChips] = useState("1000");
  const [minBet, setMinBet] = useState("20");
  const [code, setCode] = useState("");

  async function createRoom() {
    setError("");
    setLoading(true);
    try {
      const { roomId } = await apiCall("/api/room", "POST", {
        variant,
        startingChips: Number(startingChips),
        minBet: Number(minBet),
      });
      router.push(`/room/${roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    setError("");
    if (!code.trim()) { setError("Enter a room code"); return; }
    setLoading(true);
    try {
      const { roomId } = await apiCall(`/api/room?code=${encodeURIComponent(code.trim())}`, "GET");
      router.push(`/room/${roomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <header className="flex items-center justify-between px-6 py-[13px] shrink-0">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[22px] leading-none select-none"
            style={{ color: "var(--chip-gold)" }}
          >
            ♠
          </span>
<div className="flex flex-col leading-none gap-[3px]">
            <span className="font-mono text-[11px] tracking-[0.28em] text-zinc-500 uppercase">
              Community
            </span>
            <span className="font-mono text-[15px] tracking-[0.18em] text-white/90 uppercase">
              Poker
            </span>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center border border-white/[0.08]"
              style={{ background: "rgba(212,160,23,0.08)" }}
            >
              <span className="font-mono text-[9px] leading-none uppercase" style={{ color: "var(--chip-gold)", opacity: 0.8 }}>
                {(user?.displayName ?? user?.email ?? "?")[0]}
              </span>
            </div>
            <span className="font-mono text-sm text-zinc-400 max-w-[140px] truncate">
              {user?.displayName ?? user?.email}
            </span>
          </div>
          <button
            onClick={() => signOut(auth).then(() => router.replace("/login"))}
            className="px-4 py-2 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-8">
          <div className="w-full max-w-sm flex flex-col gap-0 bg-neutral-900 border border-white/[0.06] rounded-lg px-8 py-8 min-h-[420px] h-[480px]">

            {/* Tabs */}
            <div className="flex gap-0 border-b border-white/[0.06]">
              <button
                onClick={() => { setTab("create"); setError(""); }}
                className={`pb-3 pr-6 text-sm transition-all duration-200 border-b-2 -mb-px ${
                  tab === "create" ? "text-white border-white" : "text-zinc-600 border-transparent hover:text-zinc-400"
                }`}
              >
                Create
              </button>
              <button
                onClick={() => { setTab("join"); setError(""); }}
                className={`pb-3 px-6 text-sm transition-all duration-200 border-b-2 -mb-px ${
                  tab === "join" ? "text-white border-white" : "text-zinc-600 border-transparent hover:text-zinc-400"
                }`}
              >
                Join
              </button>
            </div>

            {tab === "create" ? (
              <div className="flex flex-col flex-1 gap-0 mt-2">
                <div className="flex flex-col gap-1 py-3">
                  <span className="text-xs text-zinc-500 mb-1">Variant</span>
                  <div className="flex gap-1">
                    {(["holdem", "omaha"] as GameVariant[]).map(v => (
                      <button
                        key={v}
                        onClick={() => setVariant(v)}
                        className={`text-sm px-4 py-1 rounded-full border transition-all duration-200 ${variant === v ? "text-white bg-white/10 border-white/20" : "text-zinc-600 bg-transparent border-transparent hover:text-zinc-400"}`}
                      >
                        {v === "holdem" ? "Texas Hold'em" : "Omaha"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1 py-3">
                  <span className="text-xs text-zinc-500">Starting chips</span>
                  <input
                    type="number"
                    min={20}
                    step={10}
                    value={startingChips}
                    onChange={e => setStartingChips(e.target.value)}
                    className="bg-transparent text-xl font-mono text-white focus:outline-none w-full [&::-webkit-inner-spin-button]:filter [&::-webkit-inner-spin-button]:invert [&::-webkit-outer-spin-button]:filter [&::-webkit-outer-spin-button]:invert"
                  />
                </div>

                <div className="flex flex-col gap-1 py-3">
                  <span className="text-xs text-zinc-500">Big blind</span>
                  <input
                    type="number"
                    min={2}
                    step={2}
                    value={minBet}
                    onChange={e => setMinBet(e.target.value)}
                    className="bg-transparent text-xl font-mono text-white focus:outline-none w-full [&::-webkit-inner-spin-button]:filter [&::-webkit-inner-spin-button]:invert [&::-webkit-outer-spin-button]:filter [&::-webkit-outer-spin-button]:invert"
                  />
                </div>

                {error && <p className="text-xs text-red-400/80 pt-2">{error}</p>}

                <button
                  onClick={createRoom}
                  disabled={loading}
                  className="mt-auto w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors"
                >
                  {loading ? "Creating…" : "Create Room"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col flex-1 gap-0 mt-2">
                <div className="flex flex-col gap-4 pb-5 border-b border-white/[0.06]">
                  <span className="text-xs text-zinc-500 mt-3">Room code</span>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXXX"
                    maxLength={5}
                    autoFocus
                    className="bg-transparent text-4xl font-mono font-thin text-white tracking-[0.3em] focus:outline-none placeholder:text-zinc-800 w-full"
                  />
                </div>

                {error && <p className="text-xs text-red-400/80 pt-4">{error}</p>}

                <button
                  onClick={joinRoom}
                  disabled={loading || code.length === 0}
                  className="mt-auto w-full py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors"
                >
                  {loading ? "Joining…" : "Join Room"}
                </button>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
