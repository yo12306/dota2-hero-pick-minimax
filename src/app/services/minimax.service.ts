import { Injectable } from '@angular/core';
import { Champion, AlgorithmSettings, MatchupTable, DraftState } from '../models/champion.model';

@Injectable({ providedIn: 'root' })
export class MinimaxService {

  private championWinrates: Record<string, number> = {};
  private counterTable: MatchupTable = {};
  private synergyTable: MatchupTable = {};
  private champions: Champion[] = [];

  initializeData(champions: Champion[]) {
    this.champions = champions;

    champions.forEach(c => {
      this.championWinrates[c.name] = c.winrate;
    });

    // Counter table: how well c1 counters c2 (positive = c1 has advantage)
    champions.forEach(c1 => {
      this.counterTable[c1.name] = {};
      champions.forEach(c2 => {
        this.counterTable[c1.name][c2.name] =
          c1.name === c2.name ? 0 : (Math.random() * 10 - 5); // -5 to +5
      });
    });

    // Synergy table
    champions.forEach(c1 => {
      this.synergyTable[c1.name] = {};
      champions.forEach(c2 => {
        this.synergyTable[c1.name][c2.name] =
          c1.name === c2.name ? 0 : Math.random() * 3; // 0-3
      });
    });
  }

  private getRoleCoverage(picks: string[]): number {
    const roles = new Set<string>();
    picks.forEach(name => {
      const champ = this.champions.find(c => c.name === name);
      champ?.roles.forEach(r => roles.add(r));
    });
    return roles.size; // 0–5
  }

  evaluate(state: DraftState, settings: AlgorithmSettings): number {
    let score = 0;
    const W_BASE = settings.wBase / 50;
    const W_COUNTER = settings.wCounter / 50;
    const W_SYNERGY = settings.wSynergy / 50;
    const W_ROLE = settings.wRole / 50;

    // Base winrate
    state.bluePicks.forEach(h => score += W_BASE * (this.championWinrates[h] ?? 50));
    state.redPicks.forEach(h => score -= W_BASE * (this.championWinrates[h] ?? 50));

    // Counter score (blue counters red)
    state.bluePicks.forEach(blue => {
      state.redPicks.forEach(red => {
        score += W_COUNTER * (this.counterTable[blue]?.[red] ?? 0);
      });
    });

    // Synergy score
    for (let i = 0; i < state.bluePicks.length; i++) {
      for (let j = i + 1; j < state.bluePicks.length; j++) {
        score += W_SYNERGY * (this.synergyTable[state.bluePicks[i]]?.[state.bluePicks[j]] ?? 0);
      }
    }
    for (let i = 0; i < state.redPicks.length; i++) {
      for (let j = i + 1; j < state.redPicks.length; j++) {
        score -= W_SYNERGY * (this.synergyTable[state.redPicks[i]]?.[state.redPicks[j]] ?? 0);
      }
    }

    // Role coverage bonus
    score += W_ROLE * this.getRoleCoverage(state.bluePicks);
    score -= W_ROLE * this.getRoleCoverage(state.redPicks);

    return score;
  }

  minimax(
    state: DraftState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    settings: AlgorithmSettings
  ): { score: number; move: string | null } {
    const isTerminal = state.bluePicks.length === 5 && state.redPicks.length === 5;
    if (isTerminal || depth === 0) {
      return { score: this.evaluate(state, settings), move: null };
    }

    const validMoves = [...state.availablePool];
    validMoves.sort((a, b) =>
      isMaximizing
        ? (this.championWinrates[b] ?? 50) - (this.championWinrates[a] ?? 50)
        : (this.championWinrates[a] ?? 50) - (this.championWinrates[b] ?? 50)
    );

    let bestMove: string | null = null;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const champ of validMoves) {
        const newPool = state.availablePool.filter(h => h !== champ);
        const nextState: DraftState = { ...state, bluePicks: [...state.bluePicks, champ], availablePool: newPool };
        const { score } = this.minimax(nextState, depth - 1, alpha, beta, false, settings);
        if (score > maxEval) { maxEval = score; bestMove = champ; }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      for (const champ of validMoves) {
        const newPool = state.availablePool.filter(h => h !== champ);
        const nextState: DraftState = { ...state, redPicks: [...state.redPicks, champ], availablePool: newPool };
        const { score } = this.minimax(nextState, depth - 1, alpha, beta, true, settings);
        if (score < minEval) { minEval = score; bestMove = champ; }
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return { score: minEval, move: bestMove };
    }
  }

  suggestNextPick(
    blue: Champion[],
    red: Champion[],
    allChampions: Champion[],
    existingBans: string[],
    settings: AlgorithmSettings,
    isBlueTurn: boolean
  ): { champion: string; score: number } | null {
    const takenNames = [...blue, ...red].map(c => c.name);
    const unavailable = new Set([...takenNames, ...existingBans]);
    const availablePool = allChampions.map(c => c.name).filter(n => !unavailable.has(n));

    const state: DraftState = {
      bluePicks: blue.map(c => c.name),
      redPicks: red.map(c => c.name),
      blueBans: [],
      redBans: [],
      availablePool
    };

    const { score, move } = this.minimax(state, 6, -Infinity, Infinity, isBlueTurn, settings);
    return move ? { champion: move, score } : null;
  }

  suggestNextBan(
    blue: Champion[],
    red: Champion[],
    allChampions: Champion[],
    existingBans: string[],
    settings: AlgorithmSettings,
    isBlueBanning: boolean
  ): { champion: string; threatScore: number } | null {
    const unavailable = new Set([
      ...blue.map(c => c.name),
      ...red.map(c => c.name),
      ...existingBans
    ]);
    const available = allChampions.filter(c => !unavailable.has(c.name));
    if (available.length === 0) return null;

    // Suggest banning the champion most threatening to your team
    const myPicks = isBlueBanning ? blue.map(c => c.name) : red.map(c => c.name);
    const opponentPicks = isBlueBanning ? red.map(c => c.name) : blue.map(c => c.name);

    let bestChamp: string | null = null;
    let bestScore = -Infinity;

    available.forEach(champ => {
      let threat = this.championWinrates[champ.name] ?? 50;
      // How well does this champ counter MY picks?
      myPicks.forEach(mine => {
        threat += (this.counterTable[champ.name]?.[mine] ?? 0);
      });
      // How well does this champ synergize with opponent's picks?
      opponentPicks.forEach(opp => {
        threat += (this.synergyTable[champ.name]?.[opp] ?? 0);
      });
      if (threat > bestScore) { bestScore = threat; bestChamp = champ.name; }
    });

    return bestChamp ? { champion: bestChamp, threatScore: bestScore } : null;
  }

  getImmediateScore(
    blue: Champion[],
    red: Champion[],
    champName: string,
    isBluePick: boolean,
    settings: AlgorithmSettings
  ): number {
    const state: DraftState = {
      bluePicks: isBluePick ? [...blue.map(c => c.name), champName] : blue.map(c => c.name),
      redPicks: isBluePick ? red.map(c => c.name) : [...red.map(c => c.name), champName],
      blueBans: [],
      redBans: [],
      availablePool: []
    };
    return this.evaluate(state, settings);
  }

  getCurrentScore(blue: Champion[], red: Champion[], settings: AlgorithmSettings): number {
    const state: DraftState = {
      bluePicks: blue.map(c => c.name),
      redPicks: red.map(c => c.name),
      blueBans: [],
      redBans: [],
      availablePool: []
    };
    return this.evaluate(state, settings);
  }
}