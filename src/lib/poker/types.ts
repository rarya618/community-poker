import { Card } from "./deck";

export type GameVariant = "holdem" | "omaha";
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";
export type PlayerAction = "fold" | "call" | "raise" | "check" | "all-in";

export interface Player {
  uid: string;
  name: string;
  chips: number;
  seatIndex: number;
  isConnected: boolean;
}

export interface PlayerHandState {
  folded: boolean;
  allIn: boolean;
  bet: number;       // bet so far this street
  totalBet: number;  // total chips committed this hand
  acted: boolean;
}

export interface Pot {
  amount: number;
  eligibleUids: string[]; // players who contributed to this pot (for side pots)
}

export interface GameState {
  street: Street;
  communityCards: Card[];
  pots: Pot[];
  currentBet: number;   // highest bet this street
  activeUid: string;    // whose turn it is
  dealerSeat: number;
  smallBlindUid: string;
  bigBlindUid: string;
  playerStates: Record<string, PlayerHandState>;
  lastAction?: { uid: string; action: PlayerAction; amount?: number };
  winners?: { uid: string; amount: number; handDescription: string }[];
}

export interface Room {
  id: string;
  variant: GameVariant;
  hostUid: string;
  startingChips: number;
  minBet: number;       // big blind size
  status: "waiting" | "playing" | "finished";
  players: Record<string, Player>;
  game?: GameState;
  createdAt: number;
}
