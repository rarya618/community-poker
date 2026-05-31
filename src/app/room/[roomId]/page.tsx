"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
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

  async function leaveRoom() {
    const uid = user?.uid;
    if (uid) await set(ref(db, `rooms/${roomId}/players/${uid}/isConnected`), false);
    router.replace("/lobby");
  }
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-6 bg-neutral-950">
        <p className="text-xs text-zinc-600">Room not found</p>
        <button
          onClick={() => router.replace("/lobby")}
          className="text-xs text-zinc-500 hover:text-white border-b border-zinc-700 hover:border-zinc-400 pb-px transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const uid = user?.uid ?? "";
  const isHost = room.hostUid === uid;
  const playerCount = Object.keys(room.players ?? {}).length;
  const variantLabel = room.variant === "holdem" ? "Texas Hold'em" : "Omaha";

  return (
    <div className="flex flex-col h-screen bg-neutral-950">
      {room.status === "waiting" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-12 p-8">
          <div className="absolute top-0 right-0 flex items-center gap-4 px-6 py-4">
            {error && <span className="text-xs text-red-400/80">{error}</span>}
            <button onClick={leaveRoom} className="px-4 py-2 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white transition-colors">Leave</button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] text-zinc-700">Room Code</span>
            <span className="text-6xl font-mono font-thin text-white tracking-[0.25em]">{roomId}</span>
          </div>

          <div className="flex flex-col gap-0 w-full max-w-xs">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-[10px] text-zinc-700">Players</span>
              <span className="text-[10px] font-mono text-zinc-700">{playerCount}/9</span>
            </div>
            {Object.values(room.players).map(p => (
              <div key={p.uid} className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{p.name}</span>
                  {p.uid === room.hostUid && (
                    <span className="text-[9px] text-zinc-700">host</span>
                  )}
                </div>
                <span className="text-xs font-mono text-zinc-600">{room.startingChips.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={actionLoading || playerCount < 2}
              className="w-full max-w-xs py-3 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading ? "Starting…" : playerCount < 2 ? "Need 2+ players" : "Start Game"}
            </button>
          ) : (
            <p className="text-[10px] text-zinc-700">Waiting for host…</p>
          )}
        </div>
      ) : room.status === "finished" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-neutral-950">
          <p className="text-xs text-zinc-600">Game Over</p>
          <button
            onClick={() => router.replace("/lobby")}
            className="text-xs text-zinc-500 hover:text-white border-b border-zinc-700 hover:border-zinc-400 pb-px transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      ) : room.game ? (
        <div className="flex-1 min-h-0">
          <Table
            room={room}
            game={room.game}
            currentUid={uid}
            holeCards={holeCards}
            onAction={handleAction}
            onNextHand={handleNextHand}
            onLeave={leaveRoom}
            actionLoading={actionLoading}
            error={error}
          />
        </div>
      ) : null}
    </div>
  );
}
