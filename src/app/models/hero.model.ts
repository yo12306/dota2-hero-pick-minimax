export interface Hero {
  id: number;
  name: string;
  primaryAttr: 'str' | 'agi' | 'int' | 'uni';
  imageUrl: string;
  isPicked?: boolean;
  baseWinrate?: number;
}

export type MatchupTable = Record<string, Record<string, number>>;

export interface AlgorithmSettings {
  wBase: number;
  wCounter: number;
  wSynergy: number;
}

export interface DraftState {
  radiantPicks: string[];
  direPicks: string[];
  availablePool: string[];
}
