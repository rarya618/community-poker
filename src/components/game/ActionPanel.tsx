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
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto">
      {/* Primary actions */}
      <div className="flex gap-2 justify-center">
        <Button variant="danger" onClick={() => onAction("fold")} disabled={loading} size="lg">
          Fold
        </Button>
        {canCheck ? (
          <Button variant="secondary" onClick={() => onAction("check")} disabled={loading} size="lg">
            Check
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => onAction("call")} disabled={loading} size="lg">
            Call {callAmount.toLocaleString()}
          </Button>
        )}
        <Button
          onClick={() => onAction("all-in")}
          disabled={loading}
          size="lg"
          className="bg-orange-700 hover:bg-orange-600 text-white px-6 py-3 text-base rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          All In
        </Button>
      </div>

      {/* Raise presets */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => setPreset(p.value)}
            disabled={loading || p.value >= maxRaise}
            className={`rounded-md border px-3 py-1 text-xs font-semibold transition
              ${raiseValue === p.value
                ? "border-green-500 bg-green-700/40 text-green-300"
                : "border-white/20 text-zinc-400 hover:border-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
          >
            {p.label}
            <span className="ml-1 text-zinc-500 font-normal">{p.value.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Custom raise input + submit */}
      <div className="flex items-center gap-2 justify-center">
        <input
          type="number"
          min={minRaise}
          max={maxRaise}
          step={minBet}
          value={raiseAmount}
          onChange={e => setRaiseAmount(e.target.value)}
          placeholder={`min ${minRaise.toLocaleString()}`}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-zinc-500 w-36 text-sm focus:outline-none focus:border-green-500"
        />
        <Button
          variant="primary"
          onClick={() => { onAction("raise", raiseValue); setRaiseAmount(""); }}
          disabled={loading || !canRaise}
        >
          Raise {canRaise ? raiseValue.toLocaleString() : ""}
        </Button>
      </div>
    </div>
  );
}
