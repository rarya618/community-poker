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
  onLeave: () => void;
  actionLoading: boolean;
  error?: string;
}

function getSeatPositions(count: number): { top: string; left: string }[] {
  const cx = 50, cy = 50, rx = 38, ry = 34;
  return Array.from({ length: count }, (_, i) => {
    const rad = ((90 + i * (360 / count)) * Math.PI) / 180;
    return {
      left: `${cx + rx * Math.cos(rad)}%`,
      top: `${cy + ry * Math.sin(rad)}%`,
    };
  });
}

export function Table({ room, game, currentUid, holeCards, onAction, onNextHand, onLeave, actionLoading, error }: TableProps) {
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
    <div className="flex h-full bg-neutral-950">
      {/* Table area */}
      <div className="relative flex-1">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {communityCards.map((card, i) => (
              <PlayingCard key={i} card={card} size="md" />
            ))}
            {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
              <div key={i} className="w-16 h-24 rounded opacity-[0.06] bg-white/10" />
            ))}
          </div>
          {totalPot > 0 && (
            <div className="flex flex-col items-center gap-0.5 mt-1">
              <span className="text-xl font-mono text-white">{totalPot.toLocaleString()}</span>
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
          const pos = getSeatPositions(players.length)[idx];
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

      {/* Right pane */}
      <div className="w-72 border-l border-white/10 bg-neutral-900 flex flex-col shrink-0">
        {/* Room info */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-white text-sm">{room.id}</span>
            <span className="text-[10px] text-zinc-600">{room.variant === "holdem" ? "Texas Hold'em" : "Omaha"}</span>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-400/80">{error}</span>}
            <button onClick={onLeave} className="px-3 py-1.5 text-xs font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white transition-colors">Leave</button>
          </div>
        </div>

        {/* Action log */}
        <div className="flex-1 overflow-y-auto flex flex-col-reverse px-4 py-3 gap-1 min-h-0">
          {[...(game.actionLog ?? [])].reverse().map((entry, i) => {
            if (entry.kind === "street") {
              return (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-zinc-600">{entry.street}</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
              );
            }
            if (entry.kind === "blind") {
              return (
                <div key={i} className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">{room.players[entry.uid]?.name ?? entry.uid}</span>
                  <span className="text-xs text-zinc-600 font-mono">{entry.type === "small" ? "SB" : "BB"} {entry.amount.toLocaleString()}</span>
                </div>
              );
            }
            const name = room.players[entry.uid]?.name ?? entry.uid;
            const label = entry.action === "raise" && entry.amount
              ? `raise ${entry.amount.toLocaleString()}`
              : entry.action === "call"
              ? `call`
              : entry.action;
            return (
              <div key={i} className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-400">{name}</span>
                <span className={cn(
                  "text-xs font-mono",
                  entry.action === "fold" ? "text-red-500/60" :
                  entry.action === "raise" ? "text-blue-400/70" :
                  entry.action === "all-in" ? "text-amber-400/70" :
                  "text-zinc-500"
                )}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="border-t border-white/[0.06] px-5 py-5 flex flex-col justify-center">
          {isShowdown ? (
            <div className="flex flex-col gap-3">
              {game.winners?.map(w => (
                <div key={w.uid} className="flex flex-col gap-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-white">{room.players[w.uid]?.name ?? w.uid}</span>
                    <span className="font-mono text-sm text-zinc-300">+{w.amount.toLocaleString()}</span>
                  </div>
                  {w.handDescription !== "Last player standing" && (
                    <span className="text-xs text-zinc-600">{w.handDescription}</span>
                  )}
                </div>
              ))}
              {room.hostUid === currentUid ? (
                <button
                  onClick={onNextHand}
                  disabled={actionLoading}
                  className="mt-2 w-full py-2.5 text-sm font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-30 transition-colors"
                >
                  {actionLoading ? "Starting…" : "Next Hand"}
                </button>
              ) : (
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
            <p className="text-sm text-zinc-500">
              {game.playerStates[currentUid]?.folded
                ? "You folded"
                : `It's ${room.players[game.activeUid]?.name ?? "someone"}'s turn to act`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
