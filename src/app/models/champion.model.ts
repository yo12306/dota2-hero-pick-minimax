export type Role = 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support';
export type ChampionClass = 'Marksman' | 'Mage' | 'Assassin' | 'Tank' | 'Support' | 'Fighter';
export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Champion {
  id: number;
  key: string;
  name: string;
  roles: Role[];
  classes: ChampionClass[];
  imageUrl: string;
  isPicked?: boolean;
  isBanned?: boolean;
  winrate: number;
  tier: Tier;
}

export type MatchupTable = Record<string, Record<string, number>>;

export interface AlgorithmSettings {
  wBase: number;
  wCounter: number;
  wSynergy: number;
  wRole: number;
  wBan: number;
}

export interface DraftState {
  bluePicks: string[];
  redPicks: string[];
  blueBans: string[];
  redBans: string[];
  availablePool: string[];
}

export type DraftActionType = { team: 'blue' | 'red'; action: 'pick' | 'ban' };