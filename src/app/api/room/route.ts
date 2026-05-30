import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyRequest } from "@/lib/auth-helpers";
import { GameVariant, Room } from "@/lib/poker/types";

function roomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// POST /api/room — create a new room
export async function POST(req: NextRequest) {
  try {
    const uid = await verifyRequest(req);
    const { variant, startingChips, minBet, name } = await req.json() as {
      variant: GameVariant;
      startingChips: number;
      minBet: number;
      name: string;
    };

    if (!["holdem", "omaha"].includes(variant)) {
      return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
    }
    if (startingChips < 20 || minBet < 1) {
      return NextResponse.json({ error: "Invalid chip/blind values" }, { status: 400 });
    }

    const db = adminDb();
    const roomId = roomCode();

    // Fetch host's display name
    const snap = await db.ref(`users/${uid}`).get();
    const hostName = snap.val()?.name ?? "Host";

    const room: Room = {
      id: roomId,
      variant,
      hostUid: uid,
      startingChips,
      minBet,
      status: "waiting",
      players: {
        [uid]: {
          uid,
          name: hostName,
          chips: startingChips,
          seatIndex: 0,
          isConnected: true,
        },
      },
      createdAt: Date.now(),
    };

    await db.ref(`rooms/${roomId}`).set(room);
    return NextResponse.json({ roomId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/room?code=XXXXX — join a room by code
export async function GET(req: NextRequest) {
  try {
    const uid = await verifyRequest(req);
    const roomId = req.nextUrl.searchParams.get("code")?.toUpperCase();
    if (!roomId) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const db = adminDb();
    const snap = await db.ref(`rooms/${roomId}`).get();
    if (!snap.exists()) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const room = snap.val() as Room;
    if (room.status !== "waiting") {
      return NextResponse.json({ error: "Game already started" }, { status: 400 });
    }

    const playerCount = Object.keys(room.players ?? {}).length;
    if (playerCount >= 9) return NextResponse.json({ error: "Room is full" }, { status: 400 });

    // Get user's display name
    const userSnap = await db.ref(`users/${uid}`).get();
    const playerName = userSnap.val()?.name ?? "Player";

    if (!room.players[uid]) {
      await db.ref(`rooms/${roomId}/players/${uid}`).set({
        uid,
        name: playerName,
        chips: room.startingChips,
        seatIndex: playerCount,
        isConnected: true,
      });
    }

    return NextResponse.json({ roomId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
