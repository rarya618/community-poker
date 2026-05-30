"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRoom, useHoleCards } from "@/hooks/useRoom";
import { apiCall } from "@/hooks/useApiCall";
import { Table } from "@/components/game/Table";
import { Button } from "@/components/ui/Button";
import { PlayerAction } from "@/lib/poker/types";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const { room, loading } = useRoom(roomId);
  const holeCards = useHoleCards(roomId, user?.uid ?? null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  async function startGame() {
    setError("");
    setActionLoading(true);
    try {
      await apiCall("/api/game/start", "POST", { roomId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start game");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAction(action: PlayerAction, raiseAmount?: number) {
    setError("");
    setActionLoading(true);
    try {
      await apiCall("/api/game/action", "POST", { roomId, action, raiseAmount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleNextHand() {
    setError("");
    setActionLoading(true);
    try {
      const result = await apiCall("/api/game/next-hand", "POST", { roomId });
      if (result.finished) router.replace("/lobby");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start next hand");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <p className="text-zinc-300">Room not found.</p>
        <Button onClick={() => router.replace("/lobby")}>Back to Lobby</Button>
      </div>
    );
  }

  const uid = user?.uid ?? "";
  const isHost = room.hostUid === uid;
  const playerCount = Object.keys(room.players ?? {}).length;
  const variantLabel = room.variant === "holdem" ? "Texas Hold'em" : "Omaha";

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">Room <span className="font-mono text-green-400">{roomId}</span></span>
          <span className="text-xs text-zinc-400 border border-white/20 rounded px-2 py-0.5">{variantLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <Button variant="ghost" size="sm" onClick={() => signOut(auth).then(() => router.replace("/login"))}>
            Leave
          </Button>
        </div>
      </header>

      {room.status === "waiting" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Waiting for players</h2>
            <p className="text-zinc-400 text-sm">Share the room code with friends</p>
          </div>
          <div className="text-6xl font-mono font-bold text-green-400 tracking-widest border-2 border-green-700 rounded-2xl px-8 py-4 bg-black/30">
            {roomId}
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Players ({playerCount}/9)</h3>
            <div className="flex flex-col gap-2">
              {Object.values(room.players).map(p => (
                <div key={p.uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-white">{p.name}</span>
                    {p.uid === room.hostUid && <span className="text-[10px] text-yellow-400 font-bold">HOST</span>}
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">{room.startingChips.toLocaleString()} chips</span>
                </div>
              ))}
            </div>
          </div>
          {isHost && (
            <Button
              size="lg"
              onClick={startGame}
              disabled={actionLoading || playerCount < 2}
            >
              {actionLoading ? "Starting…" : playerCount < 2 ? "Need 2+ players" : "Start Game"}
            </Button>
          )}
          {!isHost && <p className="text-zinc-400 text-sm">Waiting for host to start the game…</p>}
        </div>
      ) : room.status === "finished" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold text-white">Game Over</h2>
          <Button onClick={() => router.replace("/lobby")}>Back to Lobby</Button>
        </div>
      ) : room.game ? (
        <div className="flex-1 overflow-hidden">
          <Table
            room={room}
            game={room.game}
            currentUid={uid}
            holeCards={holeCards}
            onAction={handleAction}
            onNextHand={handleNextHand}
            actionLoading={actionLoading}
          />
        </div>
      ) : null}
    </div>
  );
}
