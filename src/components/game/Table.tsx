"use client";
import { PlayingCard } from "./Card";
import { PlayerSeat } from "./PlayerSeat";
import { ActionPanel } from "./ActionPanel";
import { GameState, Player, PlayerAction, Room } from "@/lib/poker/types";
import { Card as CardType } from "@/lib/poker/deck";
import { calculateSidePots } from "@/lib/poker/engine";
import { cn } from "@/lib/utils";

interface TableProps {
  room: Room;
  game: GameState;
  currentUid: string;
  holeCards: CardType[];
  onAction: (action: PlayerAction, raiseAmount?: number) => void;
  onNextHand: () => void;
  actionLoading: boolean;
}

// Seat positions around the table (as percentages of the table container)
const SEAT_POSITIONS = [
  { top: "80%", left: "50%" },   // 0 - bottom center (hero)
  { top: "80%", left: "20%" },   // 1 - bottom left
  { top: "55%", left: "5%" },    // 2 - left
  { top: "20%", left: "15%" },   // 3 - top left
  { top: "10%", left: "50%" },   // 4 - top center
  { top: "20%", left: "85%" },   // 5 - top right
  { top: "55%", left: "95%" },   // 6 - right
  { top: "80%", left: "80%" },   // 7 - bottom right
  { top: "65%", left: "50%" },   // 8 - bottom center alt
];

export function Table({ room, game, currentUid, holeCards, onAction, onNextHand, actionLoading }: TableProps) {
  const sortedPlayers = Object.values(room.players).sort((a, b) => a.seatIndex - b.seatIndex);
  const heroIdx = sortedPlayers.findIndex(p => p.uid === currentUid);
  // Rotate so the current player is always first (bottom-center seat)
  const players = heroIdx <= 0
    ? sortedPlayers
    : [...sortedPlayers.slice(heroIdx), ...sortedPlayers.slice(0, heroIdx)];
  const communityCards = game.communityCards ?? [];
  // Derive the displayed pot from side pot calculation so it excludes uncalled bets
  const { pots: effectivePots } = calculateSidePots(game.playerStates ?? {}, players);
  // Only count pots with 2+ eligible players; single-eligible pots are money auto-returned to that player
  const contestedPots = effectivePots.filter(p => p.eligibleUids.length > 1);
  const totalPot = contestedPots.reduce((s, p) => s + p.amount, 0);
  const hasMultiplePots = contestedPots.length > 1;
  const isMyTurn = game.activeUid === currentUid;
  const currentPlayer = room.players[currentUid];
  const holeCardCount = room.variant === "omaha" ? 4 : 2;
  const isShowdown = game.street === "showdown";

  return (
    <div className="flex flex-col h-full">
      {/* Table area */}
      <div className="relative flex-1 min-h-[420px]">
        {/* Felt */}
        <div
          className="absolute inset-8 rounded-[50%] border-4 border-[#0a3020]"
          style={{ background: "radial-gradient(ellipse at center, #1e6b3e 0%, #155230 60%, #0f3d25 100%)" }}
        />

        {/* Community cards + pot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {communityCards.map((card, i) => (
              <PlayingCard key={i} card={card} size="md" />
            ))}
            {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
              <div key={i} className="w-14 h-20 rounded-lg border border-white/10 border-dashed opacity-30" />
            ))}
          </div>
          {totalPot > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="rounded-full bg-black/50 border border-yellow-600/50 px-4 py-1 text-sm font-bold text-yellow-400">
                Pot: {totalPot.toLocaleString()}
              </div>
              {hasMultiplePots && contestedPots.map((p, i) => (
                <div key={i} className="text-[10px] text-zinc-400">
                  {i === 0 ? "Main" : `Side ${i}`}: {p.amount.toLocaleString()}
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-zinc-400 capitalize font-medium">{game.street}</div>
        </div>

        {/* Players at seats */}
        {players.map((player, idx) => {
          const pos = SEAT_POSITIONS[idx] ?? { top: "50%", left: "50%" };
          return (
            <div
              key={player.uid}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: pos.top, left: pos.left }}
            >
              <PlayerSeat
                player={player}
                handState={game.playerStates[player.uid]}
                holeCards={player.uid === currentUid ? holeCards : undefined}
                isActive={game.activeUid === player.uid}
                isDealer={player.seatIndex === game.dealerSeat}
                isSmallBlind={player.uid === game.smallBlindUid}
                isBigBlind={player.uid === game.bigBlindUid}
                isCurrentUser={player.uid === currentUid}
                holeCardCount={holeCardCount}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom panel */}
      <div className="border-t border-white/10 bg-black/30 px-6 py-4 min-h-[120px] flex items-center justify-center">
        {isShowdown ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {game.winners?.map(w => (
              <div key={w.uid} className="text-green-400 font-semibold">
                {room.players[w.uid]?.name ?? w.uid} wins {w.amount.toLocaleString()} chips
                {w.handDescription !== "Last player standing" && ` — ${w.handDescription}`}
              </div>
            ))}
            {room.hostUid === currentUid && (
              <button
                onClick={onNextHand}
                disabled={actionLoading}
                className="mt-2 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-2.5 transition disabled:opacity-50"
              >
                {actionLoading ? "Starting…" : "Next Hand"}
              </button>
            )}
            {room.hostUid !== currentUid && (
              <p className="text-zinc-400 text-sm">Waiting for host to start next hand…</p>
            )}
          </div>
        ) : isMyTurn && currentPlayer ? (
          <ActionPanel
            game={game}
            currentPlayer={currentPlayer}
            minBet={room.minBet}
            onAction={onAction}
            loading={actionLoading}
          />
        ) : (
          <p className="text-zinc-400 text-sm">
            {game.playerStates[currentUid]?.folded
              ? "You folded. Waiting for the hand to end…"
              : `Waiting for ${room.players[game.activeUid]?.name ?? "other player"}…`}
          </p>
        )}
      </div>
    </div>
  );
}
