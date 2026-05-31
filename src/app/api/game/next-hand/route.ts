import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequest } from "@/lib/auth-helpers";
import { dealNewHand } from "@/lib/poker/engine";
import { Player, Room } from "@/lib/poker/types";

// POST /api/game/next-hand — called after showdown to start the next hand
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyRequest(req);
    const { roomId } = await req.json() as { roomId: string };

    const db = adminDb();
    const snap = await db.ref(`rooms/${roomId}`).get();
    if (!snap.exists()) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const room = snap.val() as Room;
    if (room.hostUid !== uid) return NextResponse.json({ error: "Only host can advance" }, { status: 403 });

    const players: Player[] = Object.values(room.players ?? {}).filter(p => p.chips > 0);
    if (players.length < 2) {
      await db.ref(`rooms/${roomId}/status`).set("finished");
      return NextResponse.json({ ok: true, finished: true });
    }

    // Rotate dealer seat
    const currentDealerSeat = room.game?.dealerSeat ?? 0;
    const sortedSeats = players.map(p => p.seatIndex).sort((a, b) => a - b);
    const dealerIdx = sortedSeats.indexOf(currentDealerSeat);
    const nextDealerSeat = sortedSeats[(dealerIdx + 1) % sortedSeats.length];

    const { gameState, holeCards, deck } = dealNewHand(players, room.variant, nextDealerSeat, room.minBet);

    // Clear old private data first, then write new hole cards in a separate update
    await db.ref(`private/${roomId}`).remove();

    const updates: Record<string, unknown> = {};
    updates[`rooms/${roomId}/game`] = gameState;
    updates[`private/${roomId}/deck`] = deck;
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
