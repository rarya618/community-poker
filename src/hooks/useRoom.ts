"use client";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Room } from "@/lib/poker/types";
import { Card } from "@/lib/poker/deck";

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    return onValue(roomRef, snap => {
      setRoom(snap.val() as Room | null);
      setLoading(false);
    });
  }, [roomId]);

  return { room, loading };
}

export function useHoleCards(roomId: string | null, uid: string | null) {
  const [holeCards, setHoleCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!roomId || !uid) return;
    const cardsRef = ref(db, `private/${roomId}/${uid}/holeCards`);
    return onValue(cardsRef, snap => {
      setHoleCards(snap.val() ?? []);
    });
  }, [roomId, uid]);

  return holeCards;
}
