import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequest } from "@/lib/auth-helpers";
import { applyAction, resolveShowdown, communityCardCount } from "@/lib/poker/engine";
import { Card, freshDeck, shuffle } from "@/lib/poker/deck";
import { GameState, Player, Room } from "@/lib/poker/types";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyRequest(req);
    const { roomId } = await req.json() as { roomId: string };

    const db = adminDb();
    const snap = await db.ref(`rooms/${roomId}`).get();
    if (!snap.exists()) return NextResponse.json({ ok: true });

    const room = snap.val() as Room;
    const allPlayers: Player[] = Object.values(room.players ?? {});
    const remainingPlayers = allPlayers.filter(p => p.uid !== uid);
    const updates: Record<string, unknown> = {};

    // Last player leaving — delete the room entirely
    if (remainingPlayers.length === 0) {
      await db.ref(`rooms/${roomId}`).remove();
      await db.ref(`private/${roomId}`).remove();
      return NextResponse.json({ ok: true });
    }

    // Handle active hand: fold the leaving player if they're dealt in
    if (room.status === "playing" && room.game) {
      const game = room.game as GameState;
      const handState = game.playerStates?.[uid];

      if (handState && !handState.folded) {
        let newState: GameState;

        if (game.activeUid === uid) {
          // Their turn — fold via applyAction so the game advances correctly
          newState = applyAction(game, allPlayers, uid, "fold");

          if (newState.street !== game.street) {
            const storedDeck = (await db.ref(`private/${roomId}/deck`).get()).val() as Card[] | null;
            const deck = storedDeck ?? shuffle(freshDeck());
            const usedCount = allPlayers.length * (room.variant === "omaha" ? 4 : 2);
            const needed = communityCardCount(newState.street);
            if (needed > 0) {
              newState = { ...newState, communityCards: deck.slice(usedCount, usedCount + needed) };
            }
            updates[`private/${roomId}/deck`] = deck;
          }

          if (newState.street === "showdown" && !newState.winners?.length) {
            const privateSnap = await db.ref(`private/${roomId}`).get();
            const privateData = privateSnap.val() ?? {};
            const holeCards: Record<string, Card[]> = {};
            for (const [pUid, data] of Object.entries(privateData)) {
              if (pUid !== "deck" && (data as Record<string, unknown>).holeCards) {
                holeCards[pUid] = (data as Record<string, Card[]>).holeCards;
              }
            }
            newState = resolveShowdown(newState, allPlayers, holeCards, room.variant);
          }
        } else {
          // Not their turn — manually fold and check if hand is over
          newState = {
            ...game,
            playerStates: {
              ...game.playerStates,
              [uid]: { ...handState, folded: true },
            },
          };
          const nonFolded = allPlayers.filter(p => !newState.playerStates[p.uid]?.folded);
          if (nonFolded.length === 1) {
            newState = resolveShowdown(newState, allPlayers);
          }
        }

        // Apply chip changes on showdown (skip the leaving player)
        if (newState.street === "showdown" && newState.winners) {
          for (const [pUid, ps] of Object.entries(newState.playerStates)) {
            if (pUid === uid) continue;
            const currentChips = room.players[pUid]?.chips ?? 0;
            updates[`rooms/${roomId}/players/${pUid}/chips`] = currentChips - ps.totalBet;
          }
          for (const winner of newState.winners) {
            if (winner.uid === uid) continue;
            const current = (updates[`rooms/${roomId}/players/${winner.uid}/chips`] as number)
              ?? room.players[winner.uid]?.chips ?? 0;
            updates[`rooms/${roomId}/players/${winner.uid}/chips`] = current + winner.amount;
          }
        }

        updates[`rooms/${roomId}/game`] = newState;
      }
    }

    // Remove player from room
    updates[`rooms/${roomId}/players/${uid}`] = null;

    // Transfer host if the host is leaving
    if (room.hostUid === uid) {
      updates[`rooms/${roomId}/hostUid`] = remainingPlayers[0].uid;
    }

    // End game if too few players remain in an active game
    if (room.status === "playing" && remainingPlayers.length < 2) {
      updates[`rooms/${roomId}/status`] = "finished";
    }

    await db.ref().update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
