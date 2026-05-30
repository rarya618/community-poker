import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequest } from "@/lib/auth-helpers";
import { dealNewHand } from "@/lib/poker/engine";
import { Player, Room } from "@/lib/poker/types";

// POST /api/game/start — host starts the game
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyRequest(req);
    const { roomId } = await req.json() as { roomId: string };

    const db = adminDb();
    const snap = await db.ref(`rooms/${roomId}`).get();
    if (!snap.exists()) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const room = snap.val() as Room;
    if (room.hostUid !== uid) return NextResponse.json({ error: "Only the host can start" }, { status: 403 });
    if (room.status !== "waiting") return NextResponse.json({ error: "Game already started" }, { status: 400 });

    const players: Player[] = Object.values(room.players ?? {});
    if (players.length < 2) return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });

    const dealerSeat = players[0].seatIndex;
    const { gameState, holeCards } = dealNewHand(players, room.variant, dealerSeat, room.minBet);

    const updates: Record<string, unknown> = {};
    updates[`rooms/${roomId}/status`] = "playing";
    updates[`rooms/${roomId}/game`] = gameState;

    // Store each player's hole cards at a private path, readable only by that player
    for (const [playerUid, cards] of Object.entries(holeCards)) {
      updates[`private/${roomId}/${playerUid}/holeCards`] = cards;
    }

    await db.ref().update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
