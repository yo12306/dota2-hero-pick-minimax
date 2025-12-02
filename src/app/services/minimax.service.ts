import { Injectable } from '@angular/core';
import { Hero, AlgorithmSettings, MatchupTable, DraftState } from '../models/hero.model';

@Injectable({ providedIn: 'root' })
export class MinimaxService {

  private heroWinrates: Record<string, number> = {};
  private counterTable: MatchupTable = {};
  private synergyTable: MatchupTable = {};

  initializeData(heroes: Hero[]) {
    // สร้าง mock data
    heroes.forEach(h => {
      this.heroWinrates[h.name] = 45 + Math.random() * 10; // 45-55%
    });

    // Counter table
    heroes.forEach(h1 => {
      this.counterTable[h1.name] = {};
      heroes.forEach(h2 => {
        this.counterTable[h1.name][h2.name] =
          h1.name === h2.name ? 0 : (Math.random() * 10 - 5); // -5 to +5
      });
    });

    // Synergy table
    heroes.forEach(h1 => {
      this.synergyTable[h1.name] = {};
      heroes.forEach(h2 => {
        this.synergyTable[h1.name][h2.name] =
          h1.name === h2.name ? 0 : Math.random() * 3; // 0-3
      });
    });
  }

  evaluate(state: DraftState, settings: AlgorithmSettings): number {
    let score = 0;
    const W_BASE = settings.wBase / 50;
    const W_COUNTER = settings.wCounter / 50;
    const W_SYNERGY = settings.wSynergy / 50;

    // Base Winrate
    state.radiantPicks.forEach(h => {
      score += W_BASE * (this.heroWinrates[h] ?? 50);
    });
    state.direPicks.forEach(h => {
      score -= W_BASE * (this.heroWinrates[h] ?? 50);
    });

    // Counter Score
    state.radiantPicks.forEach(rad => {
      state.direPicks.forEach(dire => {
        score += W_COUNTER * (this.counterTable[rad]?.[dire] ?? 0);
      });
    });

    // Synergy Score
    for (let i = 0; i < state.radiantPicks.length; i++) {
      for (let j = i + 1; j < state.radiantPicks.length; j++) {
        score += W_SYNERGY * (this.synergyTable[state.radiantPicks[i]]?.[state.radiantPicks[j]] ?? 0);
      }
    }
    for (let i = 0; i < state.direPicks.length; i++) {
      for (let j = i + 1; j < state.direPicks.length; j++) {
        score -= W_SYNERGY * (this.synergyTable[state.direPicks[i]]?.[state.direPicks[j]] ?? 0);
      }
    }

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

    const isTerminal = state.radiantPicks.length === 5 && state.direPicks.length === 5;
    if (isTerminal || depth === 0) {
      return { score: this.evaluate(state, settings), move: null };
    }

    const validMoves = [...state.availablePool];
    validMoves.sort((a, b) =>
      isMaximizing
        ? (this.heroWinrates[b] ?? 50) - (this.heroWinrates[a] ?? 50)
        : (this.heroWinrates[a] ?? 50) - (this.heroWinrates[b] ?? 50)
    );

    let bestMove: string | null = null;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const hero of validMoves) {
        const newPool = state.availablePool.filter(h => h !== hero);
        const nextState: DraftState = {
          radiantPicks: [...state.radiantPicks, hero],
          direPicks: state.direPicks,
          availablePool: newPool
        };
        const { score } = this.minimax(nextState, depth - 1, alpha, beta, false, settings);
        if (score > maxEval) {
          maxEval = score;
          bestMove = hero;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity;
      for (const hero of validMoves) {
        const newPool = state.availablePool.filter(h => h !== hero);
        const nextState: DraftState = {
          radiantPicks: state.radiantPicks,
          direPicks: [...state.direPicks, hero],
          availablePool: newPool
        };
        const { score } = this.minimax(nextState, depth - 1, alpha, beta, true, settings);
        if (score < minEval) {
          minEval = score;
          bestMove = hero;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return { score: minEval, move: bestMove };
    }
  }

  suggestNextPick(
    radiant: Hero[],
    dire: Hero[],
    allHeroes: Hero[],
    settings: AlgorithmSettings,
    isRadiantTurn: boolean
  ): { hero: string; score: number } | null {

    const pickedNames = [...radiant, ...dire].map(h => h.name);
    const availablePool = allHeroes.map(h => h.name).filter(n => !pickedNames.includes(n));

    const state: DraftState = {
      radiantPicks: radiant.map(h => h.name),
      direPicks: dire.map(h => h.name),
      availablePool
    };

    const { score, move } = this.minimax(state, 4, -Infinity, Infinity, isRadiantTurn, settings);

    return move ? { hero: move, score } : null;
  }

  // คำนวณ score ทันทีหลังเลือก hero (ไม่ lookahead)
  getImmediateScore(
    radiant: Hero[],
    dire: Hero[],
    heroName: string,
    isRadiantPick: boolean,
    settings: AlgorithmSettings
  ): number {
    const newRadiant = isRadiantPick
      ? [...radiant.map(h => h.name), heroName]
      : radiant.map(h => h.name);
    const newDire = isRadiantPick
      ? dire.map(h => h.name)
      : [...dire.map(h => h.name), heroName];

    const state: DraftState = {
      radiantPicks: newRadiant,
      direPicks: newDire,
      availablePool: []
    };
    return this.evaluate(state, settings);
  }

  // คำนวณ score ปัจจุบันแบบ real-time
  getCurrentScore(
    radiant: Hero[],
    dire: Hero[],
    settings: AlgorithmSettings
  ): number {
    const state: DraftState = {
      radiantPicks: radiant.map(h => h.name),
      direPicks: dire.map(h => h.name),
      availablePool: []
    };
    return this.evaluate(state, settings);
  }
}
