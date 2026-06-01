"use client";
import { useState } from "react";
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

// Fixed 8-seat 3-2-3 layout. Index 0 = hero (bottom center), clockwise.
const SEAT_POSITIONS: { top: string; left: string }[] = [
  { left: "50%",  top: "83%" },  // 0: bottom center
  { left: "72%",  top: "76%" },  // 1: bottom right
  { left: "87%",  top: "52%" },  // 2: right
  { left: "72%",  top: "22%" },  // 3: top right
  { left: "50%",  top: "15%" },  // 4: top center
  { left: "28%",  top: "22%" },  // 5: top left
  { left: "13%",  top: "52%" },  // 6: left
  { left: "28%",  top: "76%" },  // 7: bottom left
];

function getSeatPositions(count: number): { top: string; left: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const seatIdx = Math.round((i * 8) / count) % 8;
    return SEAT_POSITIONS[seatIdx];
  });
}

export function Table({ room, game, currentUid, holeCards, onAction, onNextHand, onLeave, actionLoading, error }: TableProps) {
  const sortedPlayers = Object.values(room.players)
    .filter(p => !!game.playerStates[p.uid])
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const heroIdx = sortedPlayers.findIndex(p => p.uid === currentUid);
  // Rotate so the current player is always first (bottom-center seat)
  const players = heroIdx <= 0
    ? sortedPlayers
    : [...sortedPlayers.slice(heroIdx), ...sortedPlayers.slice(0, heroIdx)];
  const isSpectating = !game.playerStates[currentUid];
  const [expanded, setExpanded] = useState(false);

  function actionLabel(action: string, amount?: number) {
    if (action === "raise" && amount) return `raise ${amount.toLocaleString()}`;
    if (action === "all-in" && amount) return `all-in ${amount.toLocaleString()}`;
    if (action === "call") return "call";
    return action;
  }
  function actionColor(action: string) {
    if (action === "fold") return "text-red-500/60";
    if (action === "raise") return "text-blue-400/70";
    if (action === "all-in") return "text-amber-400/70";
    return "text-zinc-500";
  }
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
    <div className="relative h-full bg-neutral-950">
      {/* Table area */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
          <div className="flex gap-2">
            {communityCards.map((card, i) => (
              <PlayingCard key={i} card={card} size="md" />
            ))}
            {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
              <div key={i} className="w-16 h-24 rounded opacity-[0.06] bg-white/10" />
            ))}
          </div>
          <div className="flex flex-col items-center gap-1">
            {totalPot > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl font-mono text-white">{totalPot.toLocaleString()}</span>
                {hasMultiplePots && contestedPots.map((p, i) => (
                  <span key={i} className="text-[10px] font-mono text-zinc-700">
                    {i === 0 ? "main" : `side ${i}`} {p.amount.toLocaleString()}
                  </span>
                ))}
              </div>
            )}
            <span className="text-xs text-zinc-500">{game.street}</span>
          </div>
        </div>

        {players.map((player, idx) => {
          const pos = getSeatPositions(players.length)[idx];
          const topPct = parseFloat(pos.top);
          const betOnTop = topPct >= 50;
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
                isActive={game.activeUid === player.uid && !game.winners?.length}
                isDealer={player.seatIndex === game.dealerSeat}
                isSmallBlind={player.uid === game.smallBlindUid}
                isBigBlind={player.uid === game.bigBlindUid}
                isCurrentUser={player.uid === currentUid}
                holeCardCount={holeCardCount}
                betOnTop={betOnTop}
                playerCount={players.length}
                isWinner={game.winners?.some(w => w.uid === player.uid)}
              />
            </div>
          );
        })}
      </div>

      {/* Floating side pane */}
      <div
        className="absolute right-4 bottom-4 flex flex-col bg-neutral-900/90 backdrop-blur-sm border border-white/[0.08] rounded-xl overflow-hidden"
        style={{ width: "17rem" }}
      >
        {/* Room info */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-white text-base">{room.id}</span>
            <span className="text-xs text-zinc-500">{room.variant === "holdem" ? "Texas Hold'em" : "Omaha"}</span>
          </div>
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-400/80">{error}</span>}
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:border-white/25 hover:text-white transition-colors text-sm"
              title={expanded ? "Collapse" : "Expand"}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {expanded
                  ? <polyline points="2,4 6,8 10,4" />
                  : <polyline points="2,8 6,4 10,8" />}
              </svg>
            </button>
            <button onClick={onLeave} className="px-3 py-1.5 text-xs font-medium rounded border border-white/10 text-zinc-300 hover:border-white/25 hover:text-white transition-colors">Leave</button>
          </div>
        </div>

        {/* Last action — compact mode only */}
        {!expanded && game.lastAction && (
          <div className="flex items-baseline justify-between px-4 py-2 border-b border-white/[0.06]">
            <span className="text-xs text-zinc-400">{room.players[game.lastAction.uid]?.name ?? game.lastAction.uid}</span>
            <span className={cn("text-xs font-mono", actionColor(game.lastAction.action))}>
              {actionLabel(game.lastAction.action, game.lastAction.amount)}
            </span>
          </div>
        )}

        {/* Action log — expanded mode only */}
        <div
          className="overflow-y-auto flex flex-col-reverse px-4 py-3 gap-1 transition-all duration-300 ease-in-out"
          style={{ height: expanded ? "240px" : "0px", opacity: expanded ? 1 : 0, paddingTop: expanded ? undefined : 0, paddingBottom: expanded ? undefined : 0 }}
        >
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
                  <span className="text-xs text-zinc-400">{room.players[entry.uid]?.name ?? entry.uid}</span>
                  <span className="text-xs text-zinc-500 font-mono">{entry.type === "small" ? "SB" : "BB"} {entry.amount.toLocaleString()}</span>
                </div>
              );
            }
            const name = room.players[entry.uid]?.name ?? entry.uid;
            return (
              <div key={i} className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-400">{name}</span>
                <span className={cn("text-xs font-mono", actionColor(entry.action))}>
                  {actionLabel(entry.action, entry.amount)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="border-t border-white/[0.06] px-5 py-5 flex flex-col justify-center">
          {isShowdown ? (
            <div className="flex flex-col gap-3">
              {game.winners?.map(w => (
                <div key={w.uid} className="flex flex-col gap-0.5 rounded-lg px-4 py-3 border border-white/[0.08]" style={{ background: "rgba(212,160,23,0.07)" }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-semibold text-white truncate">{room.players[w.uid]?.name ?? w.uid}</span>
                    <span className="font-mono text-base font-bold shrink-0" style={{ color: "var(--chip-gold)" }}>+{w.amount.toLocaleString()}</span>
                  </div>
                  {w.handDescription !== "Last player standing" && (
                    <span className="text-sm text-zinc-400">{w.handDescription}</span>
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
          ) : isSpectating ? (
            <p className="text-sm text-zinc-500">Waiting for next hand…</p>
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
