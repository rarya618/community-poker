import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequest } from "@/lib/auth-helpers";
import { applyAction, resolveShowdown, communityCardCount } from "@/lib/poker/engine";
import { Card, freshDeck, shuffle } from "@/lib/poker/deck";
import { GameState, Player, PlayerAction, Room } from "@/lib/poker/types";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyRequest(req);
    const { roomId, action, raiseAmount } = await req.json() as {
      roomId: string;
      action: PlayerAction;
      raiseAmount?: number;
    };

    const db = adminDb();
    const snap = await db.ref(`rooms/${roomId}`).get();
    if (!snap.exists()) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const room = snap.val() as Room;
    if (room.status !== "playing") return NextResponse.json({ error: "Game not in progress" }, { status: 400 });

    const game = room.game as GameState;
    if (!game) return NextResponse.json({ error: "No active game state" }, { status: 400 });
    if (game.activeUid !== uid) return NextResponse.json({ error: "Not your turn" }, { status: 403 });

    const players: Player[] = Object.values(room.players);
    let newState = applyAction(game, players, uid, action, raiseAmount);

    const updates: Record<string, unknown> = {};

    // Deal community cards whenever the street advanced (including all-in runout to showdown).
    // communityCardCount returns 5 for both "river" and "showdown", so this covers full runouts.
    if (newState.street !== game.street) {
      const storedDeck = (await db.ref(`private/${roomId}/deck`).get()).val() as Card[] | null;
      const deck = storedDeck ?? shuffle(freshDeck());
      const usedCount = Object.values(room.players).length * (room.variant === "omaha" ? 4 : 2);
      const needed = communityCardCount(newState.street);
      if (needed > 0) {
        newState = { ...newState, communityCards: deck.slice(usedCount, usedCount + needed) };
      }
      updates[`private/${roomId}/deck`] = deck;
    }

    // Resolve showdown if reached with multiple players still in.
    // Check length, not just truthiness — resolveShowdown returns winners:undefined when pending.
    if (newState.street === "showdown" && !newState.winners?.length) {
      const holeCardsSnap = await db.ref(`private/${roomId}`).get();
      const privateData = holeCardsSnap.val() ?? {};
      const holeCards: Record<string, Card[]> = {};
      for (const [pUid, data] of Object.entries(privateData)) {
        if (pUid !== "deck" && (data as Record<string, unknown>).holeCards) {
          holeCards[pUid] = (data as Record<string, Card[]>).holeCards;
        }
      }
      newState = resolveShowdown(newState, players, holeCards, room.variant);
    }

    // Apply chip changes on showdown.
    // resolveShowdown calculates correct side pots and returns uncalled bets in winner.amount,
    // so we deduct totalBet from everyone then credit each winner's amount.
    if (newState.street === "showdown" && newState.winners) {
      for (const [pUid, ps] of Object.entries(newState.playerStates)) {
        const currentChips = room.players[pUid]?.chips ?? 0;
        updates[`rooms/${roomId}/players/${pUid}/chips`] = currentChips - ps.totalBet;
      }
      for (const winner of newState.winners) {
        const current = (updates[`rooms/${roomId}/players/${winner.uid}/chips`] as number) ?? 0;
        updates[`rooms/${roomId}/players/${winner.uid}/chips`] = current + winner.amount;
      }
    }

    updates[`rooms/${roomId}/game`] = newState;
    await db.ref().update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
