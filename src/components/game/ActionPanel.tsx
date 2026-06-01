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
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onAction("fold")}
          disabled={loading}
          className="flex-1 py-2.5 text-sm font-medium rounded bg-red-900/60 border border-red-700/60 text-red-200 hover:bg-red-900/80 hover:border-red-600 disabled:opacity-30 transition-colors"
        >
          Fold
        </button>
        {canCheck ? (
          <button
            onClick={() => onAction("check")}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium rounded bg-green-900/60 border border-green-700/60 text-green-200 hover:bg-green-900/80 hover:border-green-600 disabled:opacity-30 transition-colors"
          >
            Check
          </button>
        ) : (
          <button
            onClick={() => onAction("call")}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium rounded bg-green-900/60 border border-green-700/60 text-green-200 hover:bg-green-900/80 hover:border-green-600 disabled:opacity-30 transition-colors"
          >
            Call <span className="font-mono">{callAmount.toLocaleString()}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-2 flex-wrap">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => setPreset(p.value)}
                disabled={loading || p.value >= maxRaise}
                className={`text-xs transition-colors disabled:opacity-20 disabled:cursor-not-allowed
                  ${raiseValue === p.value
                    ? "text-blue-300"
                    : "text-zinc-600 hover:text-zinc-400"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-sm font-mono text-blue-300 tabular-nums">
            {raiseValue >= minRaise ? raiseValue.toLocaleString() : minRaise.toLocaleString()}
          </span>
        </div>

        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          step={minBet}
          value={raiseValue >= minRaise ? raiseValue : minRaise}
          onChange={e => setRaiseAmount(e.target.value)}
          disabled={loading}
          style={{
            background: `linear-gradient(to right, rgb(59 130 246 / 0.7) 0%, rgb(59 130 246 / 0.7) ${((( raiseValue >= minRaise ? raiseValue : minRaise) - minRaise) / Math.max(maxRaise - minRaise, 1)) * 100}%, rgb(255 255 255 / 0.08) ${((( raiseValue >= minRaise ? raiseValue : minRaise) - minRaise) / Math.max(maxRaise - minRaise, 1)) * 100}%, rgb(255 255 255 / 0.08) 100%)`
          }}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-30
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400
            [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-blue-300/50
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { onAction("raise", raiseValue >= minRaise ? raiseValue : minRaise); setRaiseAmount(""); }}
            disabled={loading || maxRaise < minRaise}
            className="flex-1 py-2.5 text-sm font-medium rounded bg-blue-900/50 border border-blue-700/50 text-blue-200 hover:bg-blue-900/70 hover:border-blue-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors min-w-0"
          >
            Raise <span className="font-mono">{(raiseValue >= minRaise ? raiseValue : minRaise).toLocaleString()}</span>
          </button>
          <button
            onClick={() => onAction("all-in")}
            disabled={loading}
            className="shrink-0 px-4 py-2.5 text-sm font-medium rounded bg-amber-900/50 border border-amber-700/50 text-amber-200 hover:bg-amber-900/70 hover:border-amber-600 disabled:opacity-30 transition-colors"
          >
            All In
          </button>
        </div>
      </div>
    </div>
  );
}
