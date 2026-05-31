"use client";
import { useState } from "react";
import { GameState, Player, PlayerAction } from "@/lib/poker/types";
import { Button } from "@/components/ui/Button";

interface ActionPanelProps {
  game: GameState;
  currentPlayer: Player;
  minBet: number;
  onAction: (action: PlayerAction, raiseAmount?: number) => void;
  loading: boolean;
}

export function ActionPanel({ game, currentPlayer, minBet, onAction, loading }: ActionPanelProps) {
  const [raiseAmount, setRaiseAmount] = useState<string>("");
  const ps = game.playerStates[currentPlayer.uid];
  const callAmount = game.currentBet - (ps?.bet ?? 0);
  const canCheck = callAmount === 0;
  const totalPot = (game.pots ?? []).reduce((s, p) => s + p.amount, 0);
  const minRaise = Math.max(game.currentBet + minBet, minBet);
  const maxRaise = currentPlayer.chips;

  const presets = [
    { label: "Min", value: minRaise },
    { label: "½ Pot", value: Math.round(totalPot / 2) },
    { label: "¾ Pot", value: Math.round(totalPot * 0.75) },
    { label: "Pot", value: totalPot },
    { label: "2×", value: game.currentBet * 2 || minRaise * 2 },
    { label: "3×", value: game.currentBet * 3 || minRaise * 3 },
  ]
    .map(p => ({ ...p, value: Math.min(Math.max(p.value, minRaise), maxRaise) }))
    .filter((p, i, arr) => i === 0 || p.value !== arr[i - 1].value); // dedupe

  function setPreset(value: number) {
    setRaiseAmount(String(value));
  }

  const raiseValue = Number(raiseAmount);
  const canRaise = !!raiseAmount && raiseValue >= minRaise && raiseValue <= maxRaise;

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-center gap-10">
        <button
          onClick={() => onAction("fold")}
          disabled={loading}
          className="text-xs text-red-400/70 hover:text-red-300 disabled:opacity-30 transition-colors"
        >
          Fold
        </button>
        {canCheck ? (
          <button
            onClick={() => onAction("check")}
            disabled={loading}
            className="text-xs text-white hover:text-zinc-300 disabled:opacity-30 transition-colors"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction("call")}
            disabled={loading}
            className="text-xs text-white hover:text-zinc-300 disabled:opacity-30 transition-colors"
          >
            Call <span className="font-mono">{callAmount.toLocaleString()}</span>
          </button>
        )}
        <button
          onClick={() => onAction("all-in")}
          disabled={loading}
          className="text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          All In
        </button>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => setPreset(p.value)}
            disabled={loading || p.value >= maxRaise}
            className={`text-[10px] transition-colors disabled:opacity-20 disabled:cursor-not-allowed
              ${raiseValue === p.value
                ? "text-white"
                : "text-zinc-600 hover:text-zinc-400"
              }`}
          >
            {p.label} <span className="font-mono">{p.value.toLocaleString()}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 justify-center">
        <input
          type="number"
          min={minRaise}
          max={maxRaise}
          step={minBet}
          value={raiseAmount}
          onChange={e => setRaiseAmount(e.target.value)}
          placeholder={`${minRaise.toLocaleString()}`}
          className="bg-transparent border-b border-white/10 focus:border-white/30 px-1 py-1 text-white placeholder:text-zinc-700 w-28 text-xs font-mono focus:outline-none transition-colors text-center"
        />
        <button
          onClick={() => { onAction("raise", raiseValue); setRaiseAmount(""); }}
          disabled={loading || !canRaise}
          className="text-xs text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors border-b border-zinc-700 hover:border-zinc-400 pb-px"
        >
          Raise{canRaise ? <span className="font-mono ml-1">{raiseValue.toLocaleString()}</span> : null}
        </button>
      </div>
    </div>
  );
}
