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
    <div className="flex flex-col h-full bg-neutral-950">
      <div className="relative flex-1 min-h-[420px]">
        <div className="absolute inset-8 rounded-[50%] bg-neutral-900/40 border border-white/[0.04]" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {communityCards.map((card, i) => (
              <PlayingCard key={i} card={card} size="md" />
            ))}
            {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
              <div key={i} className="w-14 h-20 rounded opacity-[0.06] bg-white/10" />
            ))}
          </div>
          {totalPot > 0 && (
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <span className="text-sm font-mono text-white">{totalPot.toLocaleString()}</span>
              {hasMultiplePots && contestedPots.map((p, i) => (
                <span key={i} className="text-[10px] font-mono text-zinc-700">
                  {i === 0 ? "main" : `side ${i}`} {p.amount.toLocaleString()}
                </span>
              ))}
            </div>
          )}
          <span className="text-[10px] text-zinc-700 mt-0.5">{game.street}</span>
        </div>

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

      <div className="sticky bottom-0 border-t border-white/[0.06] bg-neutral-950 px-6 py-5 min-h-[110px] flex items-center justify-center">
        {isShowdown ? (
          <div className="flex flex-col items-center gap-3 text-center">
            {game.winners?.map(w => (
              <div key={w.uid} className="text-sm text-white">
                <span className="font-medium">{room.players[w.uid]?.name ?? w.uid}</span>
                <span className="font-mono text-zinc-400 ml-2">+{w.amount.toLocaleString()}</span>
                {w.handDescription !== "Last player standing" && (
                  <span className="text-zinc-600 text-xs ml-2">— {w.handDescription}</span>
                )}
              </div>
            ))}
            {room.hostUid === currentUid && (
              <button
                onClick={onNextHand}
                disabled={actionLoading}
                className="mt-1 text-xs text-zinc-400 hover:text-white border-b border-zinc-700 hover:border-zinc-400 pb-px transition-colors disabled:opacity-30"
              >
                {actionLoading ? "Starting…" : "Next Hand"}
              </button>
            )}
            {room.hostUid !== currentUid && (
              <p className="text-xs text-zinc-700">Waiting for host…</p>
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
          <p className="text-xs text-zinc-700">
            {game.playerStates[currentUid]?.folded
              ? "You folded"
              : `Waiting for ${room.players[game.activeUid]?.name ?? "other player"}…`}
          </p>
        )}
      </div>
    </div>
  );
}
