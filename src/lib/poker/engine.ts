import { Card, freshDeck, shuffle } from "./deck";
import { evaluateBest, evaluateOmaha } from "./evaluator";
import { ActionLogEntry, GameState, GameVariant, Player, PlayerAction, PlayerHandState, Pot, Street } from "./types";

const HOLE_CARDS: Record<GameVariant, number> = { holdem: 2, omaha: 4 };

export interface DealResult {
  gameState: GameState;
  holeCards: Record<string, Card[]>;
  deck: Card[];
}

export function dealNewHand(
  players: Player[],
  variant: GameVariant,
  dealerSeat: number,
  bigBlind: number,
): DealResult {
  const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  if (seated.length < 2) throw new Error("Need at least 2 players");

  const deck = shuffle(freshDeck());
  const holeCount = HOLE_CARDS[variant];

  const holeCards: Record<string, Card[]> = {};
  let deckIdx = 0;
  for (const p of seated) {
    holeCards[p.uid] = deck.slice(deckIdx, deckIdx + holeCount);
    deckIdx += holeCount;
  }

  const activeSeats = seated.map(p => p.seatIndex);
  const dealerIdx = activeSeats.indexOf(dealerSeat) === -1 ? 0 : activeSeats.indexOf(dealerSeat);
  const sbIdx = (dealerIdx + 1) % seated.length;
  const bbIdx = (dealerIdx + 2) % seated.length;

  const sbPlayer = seated[sbIdx];
  const bbPlayer = seated[bbIdx];
  const smallBlind = bigBlind / 2;

  const playerStates: Record<string, PlayerHandState> = {};
  for (const p of seated) {
    playerStates[p.uid] = { folded: false, allIn: false, bet: 0, totalBet: 0, acted: false };
  }

  const sbBet = Math.min(smallBlind, sbPlayer.chips);
  const bbBet = Math.min(bigBlind, bbPlayer.chips);
  playerStates[sbPlayer.uid].bet = sbBet;
  playerStates[sbPlayer.uid].totalBet = sbBet;
  if (sbBet === sbPlayer.chips) playerStates[sbPlayer.uid].allIn = true;

  playerStates[bbPlayer.uid].bet = bbBet;
  playerStates[bbPlayer.uid].totalBet = bbBet;
  if (bbBet === bbPlayer.chips) playerStates[bbPlayer.uid].allIn = true;

  const utgIdx = (bbIdx + 1) % seated.length;

  const gameState: GameState = {
    street: "preflop",
    communityCards: [],
    pots: [{ amount: sbBet + bbBet, eligibleUids: seated.map(p => p.uid) }],
    currentBet: bbBet,
    activeUid: seated[utgIdx].uid,
    dealerSeat,
    smallBlindUid: sbPlayer.uid,
    bigBlindUid: bbPlayer.uid,
    playerStates,
    actionLog: [
      { kind: "street", street: "preflop" },
      { kind: "blind", uid: sbPlayer.uid, type: "small", amount: sbBet },
      { kind: "blind", uid: bbPlayer.uid, type: "big", amount: bbBet },
    ],
  };

  return { gameState, holeCards, deck };
}

export function applyAction(
  state: GameState,
  players: Player[],
  uid: string,
  action: PlayerAction,
  raiseAmount?: number,
): GameState {
  if (state.activeUid !== uid) throw new Error("Not your turn");
  const ps = { ...state.playerStates[uid] };
  const player = players.find(p => p.uid === uid)!;
  const logAmount = action === "all-in" ? player.chips - ps.totalBet : raiseAmount;
  const logEntry: ActionLogEntry = { kind: "action", uid, action, ...(logAmount !== undefined ? { amount: logAmount } : {}) };
  const newState: GameState = {
    ...state,
    playerStates: { ...state.playerStates, [uid]: ps },
    lastAction: { uid, action, ...(logAmount !== undefined ? { amount: logAmount } : {}) },
    actionLog: [...(state.actionLog ?? []), logEntry],
  };

  const callAmount = state.currentBet - ps.bet;

  if (action === "fold") {
    ps.folded = true;
    ps.acted = true;
  } else if (action === "check") {
    if (callAmount > 0) throw new Error("Cannot check, must call or raise");
    ps.acted = true;
  } else if (action === "call") {
    const toCall = Math.min(callAmount, player.chips - ps.totalBet);
    ps.bet += toCall;
    ps.totalBet += toCall;
    ps.acted = true;
    if (ps.totalBet >= player.chips) ps.allIn = true;
    addToPot(newState, uid, toCall);
  } else if (action === "raise") {
    const newBet = raiseAmount ?? state.currentBet * 2;
    const delta = newBet - ps.bet;
    if (delta > player.chips - ps.totalBet) throw new Error("Not enough chips");
    const actualDelta = Math.min(delta, player.chips - ps.totalBet);
    ps.bet += actualDelta;
    ps.totalBet += actualDelta;
    newState.currentBet = ps.bet;
    ps.acted = true;
    for (const [oUid, ops] of Object.entries(newState.playerStates)) {
      if (oUid !== uid && !ops.folded && !ops.allIn) ops.acted = false;
    }
    if (ps.totalBet >= player.chips) ps.allIn = true;
    addToPot(newState, uid, actualDelta);
  } else if (action === "all-in") {
    const remaining = player.chips - ps.totalBet;
    ps.bet += remaining;
    ps.totalBet += remaining;
    ps.allIn = true;
    ps.acted = true;
    if (ps.bet > newState.currentBet) {
      newState.currentBet = ps.bet;
      for (const [oUid, ops] of Object.entries(newState.playerStates)) {
        if (oUid !== uid && !ops.folded && !ops.allIn) ops.acted = false;
      }
    }
    addToPot(newState, uid, remaining);
  }

  newState.playerStates[uid] = ps;

  const nonFolded = players.filter(p => !newState.playerStates[p.uid].folded);
  if (nonFolded.length === 1) {
    // Everyone else folded — resolve with side pot calculation to return uncalled bets
    return resolveShowdown(newState, players);
  }

  const activePlayers = players.filter(p => {
    const s = newState.playerStates[p.uid];
    return !s.folded && !s.allIn;
  });
  const allActed = activePlayers.every(p => newState.playerStates[p.uid].acted);

  if (allActed || activePlayers.length === 0) {
    return advanceStreet(newState, players);
  }

  newState.activeUid = nextActiveUid(newState, players, uid);
  return newState;
}

function addToPot(state: GameState, uid: string, amount: number) {
  if (state.pots.length === 0) {
    state.pots = [{ amount, eligibleUids: [uid] }];
  } else {
    state.pots[0].amount += amount;
    if (!state.pots[0].eligibleUids.includes(uid)) {
      state.pots[0].eligibleUids.push(uid);
    }
  }
}

function nextActiveUid(state: GameState, players: Player[], afterUid: string): string {
  const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const idx = seated.findIndex(p => p.uid === afterUid);
  for (let i = 1; i <= seated.length; i++) {
    const candidate = seated[(idx + i) % seated.length];
    const cs = state.playerStates[candidate.uid];
    if (!cs.folded && !cs.allIn) return candidate.uid;
  }
  return afterUid;
}

function advanceStreet(state: GameState, players: Player[]): GameState {
  const next = nextStreet(state.street);
  const newState: GameState = {
    ...state,
    street: next,
    currentBet: 0,
    playerStates: Object.fromEntries(
      Object.entries(state.playerStates).map(([uid, ps]) => [uid, { ...ps, bet: 0, acted: false }])
    ),
    actionLog: [...(state.actionLog ?? []), { kind: "street", street: next }],
  };

  if (next === "showdown") {
    return resolveShowdown(newState, players);
  }

  // If at most one player can act (everyone else folded or all-in), run out the board automatically
  const canAct = players.filter(p => {
    const s = newState.playerStates[p.uid];
    return !s.folded && !s.allIn;
  });
  if (canAct.length <= 1) {
    return advanceStreet(newState, players);
  }

  // Set first active player left of dealer for post-flop streets
  const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const dealerIdx = seated.findIndex(p => p.seatIndex === state.dealerSeat);
  for (let i = 1; i <= seated.length; i++) {
    const candidate = seated[(dealerIdx + i) % seated.length];
    const cs = newState.playerStates[candidate.uid];
    if (!cs.folded && !cs.allIn) {
      newState.activeUid = candidate.uid;
      break;
    }
  }

  return newState;
}

function nextStreet(current: Street): Street {
  const order: Street[] = ["preflop", "flop", "turn", "river", "showdown"];
  return order[order.indexOf(current) + 1] ?? "showdown";
}

// Splits chips into pots based on all-in levels.
// Returns the correct pots and any uncalled bet that must be returned to its owner.
export function calculateSidePots(
  playerStates: Record<string, PlayerHandState>,
  players: Player[],
): { pots: Pot[]; uncalledReturns: Record<string, number> } {
  const contributions = players.map(p => ({
    uid: p.uid,
    totalBet: playerStates[p.uid]?.totalBet ?? 0,
    folded: playerStates[p.uid]?.folded ?? false,
  }));

  // Use ALL players' bet levels so folded-player excess is accounted for
  const allLevels = [...new Set(contributions.map(c => c.totalBet))]
    .filter(l => l > 0)
    .sort((a, b) => a - b);

  const pots: Pot[] = [];
  const uncalledReturns: Record<string, number> = {};
  let processed = 0;

  for (const level of allLevels) {
    const increment = level - processed;
    let potAmount = 0;
    for (const c of contributions) {
      potAmount += Math.min(Math.max(c.totalBet - processed, 0), increment);
    }

    // Eligible = non-folded players who contributed to this level
    const eligible = contributions
      .filter(c => !c.folded && c.totalBet >= level)
      .map(c => c.uid);

    if (eligible.length === 0) {
      // Every contributor at this level is folded — uncalled, return to them
      for (const c of contributions.filter(c => c.totalBet >= level)) {
        const share = Math.min(c.totalBet - processed, increment);
        if (share > 0) uncalledReturns[c.uid] = (uncalledReturns[c.uid] ?? 0) + share;
      }
    } else {
      pots.push({ amount: potAmount, eligibleUids: eligible });
    }
    processed = level;
  }

  return { pots, uncalledReturns };
}

export function resolveShowdown(
  state: GameState,
  players: Player[],
  holeCards?: Record<string, Card[]>,
  variant: GameVariant = "holdem",
): GameState {
  const nonFolded = players.filter(p => !state.playerStates[p.uid]?.folded);
  const { pots, uncalledReturns } = calculateSidePots(state.playerStates, players);

  // If multiple players remain and we don't have hole cards yet, return a pending state.
  // The API route will call resolveShowdown again after fetching hole cards.
  if (nonFolded.length > 1 && !holeCards) {
    return { ...state, street: "showdown", pots };
  }

  const winnerAmounts: Record<string, number> = { ...uncalledReturns };

  if (nonFolded.length === 1) {
    const uid = nonFolded[0].uid;
    winnerAmounts[uid] = (winnerAmounts[uid] ?? 0) + pots.reduce((s, p) => s + p.amount, 0);
  } else if (holeCards) {
    const community = state.communityCards ?? [];
    const handResults: Record<string, { score: number; description: string }> = {};
    for (const p of nonFolded) {
      const cards = holeCards[p.uid] ?? [];
      const result = variant === "omaha"
        ? evaluateOmaha(cards, community)
        : evaluateBest([...cards, ...community]);
      handResults[p.uid] = { score: result.score, description: result.description };
    }

    for (const pot of pots) {
      const eligible = pot.eligibleUids
        .map(uid => ({ uid, ...handResults[uid] }))
        .filter(r => r.score !== undefined);
      if (eligible.length === 0) continue;
      const maxScore = Math.max(...eligible.map(r => r.score));
      const potWinners = eligible.filter(r => r.score === maxScore);
      const perWinner = Math.floor(pot.amount / potWinners.length);
      for (const w of potWinners) {
        winnerAmounts[w.uid] = (winnerAmounts[w.uid] ?? 0) + perWinner;
      }
    }
  }

  const winners = Object.entries(winnerAmounts)
    .filter(([, amount]) => amount > 0)
    .map(([uid, amount]) => {
      const isReturn = (uncalledReturns[uid] ?? 0) === amount;
      const handDesc = holeCards
        ? (() => {
            const community = state.communityCards ?? [];
            const cards = holeCards[uid] ?? [];
            if (cards.length === 0) return isReturn ? "Uncalled bet returned" : "Winner";
            return variant === "omaha"
              ? evaluateOmaha(cards, community).description
              : evaluateBest([...cards, ...community]).description;
          })()
        : nonFolded.length === 1 ? "Last player standing" : "Winner";
      return { uid, amount, handDescription: handDesc };
    });

  return { ...state, street: "showdown", pots, winners };
}

export function communityCardCount(street: Street): number {
  return { preflop: 0, flop: 3, turn: 4, river: 5, showdown: 5 }[street] ?? 0;
}
