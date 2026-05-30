"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/hooks/useApiCall";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GameVariant } from "@/lib/poker/types";

export default function LobbyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create room state
  const [variant, setVariant] = useState<GameVariant>("holdem");
  const [startingChips, setStartingChips] = useState("1000");
  const [minBet, setMinBet] = useState("20");

  // Join room state
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
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <span className="font-bold text-lg text-white">Community Poker</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            Hi, <span className="text-white font-medium">{user?.displayName ?? user?.email}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => signOut(auth).then(() => router.replace("/login"))}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Play a Hand</h2>

          <div className="flex rounded-lg border border-white/10 mb-6 overflow-hidden">
            <button
              onClick={() => setTab("create")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === "create" ? "bg-green-700 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Create Room
            </button>
            <button
              onClick={() => setTab("join")}
              className={`flex-1 py-2.5 text-sm font-semibold transition ${tab === "join" ? "bg-green-700 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              Join Room
            </button>
          </div>

          {tab === "create" ? (
            <div className="flex flex-col gap-4 rounded-xl bg-white/5 border border-white/10 p-6">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-2 block">Game variant</label>
                <div className="flex gap-3">
                  {(["holdem", "omaha"] as GameVariant[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setVariant(v)}
                      className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${variant === v ? "border-green-500 bg-green-700/30 text-green-300" : "border-white/20 text-zinc-400 hover:border-white/40"}`}
                    >
                      {v === "holdem" ? "Texas Hold'em" : "Omaha"}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Starting chips per player"
                type="number"
                min={20}
                step={10}
                value={startingChips}
                onChange={e => setStartingChips(e.target.value)}
              />
              <Input
                label="Big blind"
                type="number"
                min={2}
                step={2}
                value={minBet}
                onChange={e => setMinBet(e.target.value)}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button size="lg" onClick={createRoom} disabled={loading}>
                {loading ? "Creating…" : "Create Room"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl bg-white/5 border border-white/10 p-6">
              <Input
                label="Room code"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3XY"
                maxLength={5}
                className="text-center text-2xl tracking-widest font-mono uppercase"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button size="lg" onClick={joinRoom} disabled={loading}>
                {loading ? "Joining…" : "Join Room"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
