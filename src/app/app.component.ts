import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Champion, Role, Tier, DraftActionType } from './models/champion.model';
import { MinimaxService } from './services/minimax.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

const DATA_DRAGON_VERSION = '14.24.1';
const DDV = DATA_DRAGON_VERSION;

const DRAFT_SEQUENCE: DraftActionType[] = [
  // Ban Phase 1 (3 each alternating)
  { team: 'blue', action: 'ban' },
  { team: 'red',  action: 'ban' },
  { team: 'blue', action: 'ban' },
  { team: 'red',  action: 'ban' },
  { team: 'blue', action: 'ban' },
  { team: 'red',  action: 'ban' },
  // Pick Phase 1
  { team: 'blue', action: 'pick' },
  { team: 'red',  action: 'pick' },
  { team: 'red',  action: 'pick' },
  { team: 'blue', action: 'pick' },
  { team: 'blue', action: 'pick' },
  { team: 'red',  action: 'pick' },
  // Ban Phase 2 (2 each alternating, Red first)
  { team: 'red',  action: 'ban' },
  { team: 'blue', action: 'ban' },
  { team: 'red',  action: 'ban' },
  { team: 'blue', action: 'ban' },
  // Pick Phase 2
  { team: 'red',  action: 'pick' },
  { team: 'blue', action: 'pick' },
  { team: 'blue', action: 'pick' },
  { team: 'red',  action: 'pick' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private minimax = inject(MinimaxService);

  // Algorithm weight signals
  wBase    = signal(50);
  wCounter = signal(75);
  wSynergy = signal(25);
  wRole    = signal(50);
  wBan     = signal(50);

  settings = computed(() => ({
    wBase:    this.wBase(),
    wCounter: this.wCounter(),
    wSynergy: this.wSynergy(),
    wRole:    this.wRole(),
    wBan:     this.wBan()
  }));

  // Draft state
  blueTeam    = signal<Champion[]>([]);
  redTeam     = signal<Champion[]>([]);
  blueBans    = signal<string[]>([]);
  redBans     = signal<string[]>([]);
  currentStep = signal(0);

  // UI state
  searchTerm    = signal('');
  activeFilter  = signal<'ALL' | Role>('ALL');
  isCalculating = signal(false);

  // Suggestion dialog
  showDialog = signal(false);
  suggestion = signal<{
    name: string;
    score: number;
    imageUrl: string;
    forTeam: 'blue' | 'red';
    isBan: boolean;
  } | null>(null);

  // Current draft action
  currentAction = computed<DraftActionType | null>(() => {
    const step = this.currentStep();
    return step < DRAFT_SEQUENCE.length ? DRAFT_SEQUENCE[step] : null;
  });

  isDraftComplete = computed(() => this.currentStep() >= DRAFT_SEQUENCE.length);

  currentPhaseName = computed(() => {
    const step = this.currentStep();
    if (step < 6)  return 'Ban Phase 1';
    if (step < 12) return 'Pick Phase 1';
    if (step < 16) return 'Ban Phase 2';
    if (step < 20) return 'Pick Phase 2';
    return 'Draft Complete';
  });

  allBans = computed(() => [...this.blueBans(), ...this.redBans()]);

  currentScore = computed(() => {
    const blue = this.blueTeam();
    const red  = this.redTeam();
    if (blue.length === 0 && red.length === 0) return 0;
    return this.minimax.getCurrentScore(blue, red, this.settings());
  });

  constructor() {
    this.minimax.initializeData(this.allChampions());
  }

  allChampions = signal<Champion[]>([
    { id: 1,  key: 'Jinx',       name: 'Jinx',       roles: ['Bot'],            classes: ['Marksman'],           imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Jinx.png`,       winrate: 50.5, tier: 'A' },
    { id: 2,  key: 'Ahri',       name: 'Ahri',       roles: ['Mid'],            classes: ['Mage', 'Assassin'],   imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Ahri.png`,       winrate: 51.2, tier: 'A' },
    { id: 3,  key: 'Yasuo',      name: 'Yasuo',      roles: ['Mid', 'Top'],     classes: ['Fighter', 'Assassin'],imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Yasuo.png`,      winrate: 49.8, tier: 'B' },
    { id: 4,  key: 'Thresh',     name: 'Thresh',     roles: ['Support'],        classes: ['Support', 'Tank'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Thresh.png`,     winrate: 52.1, tier: 'S' },
    { id: 5,  key: 'Zed',        name: 'Zed',        roles: ['Mid'],            classes: ['Assassin'],           imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Zed.png`,        winrate: 50.8, tier: 'A' },
    { id: 6,  key: 'Lux',        name: 'Lux',        roles: ['Mid', 'Support'], classes: ['Mage', 'Support'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Lux.png`,        winrate: 51.5, tier: 'A' },
    { id: 7,  key: 'Malphite',   name: 'Malphite',   roles: ['Top'],            classes: ['Tank', 'Fighter'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Malphite.png`,   winrate: 50.2, tier: 'B' },
    { id: 8,  key: 'LeeSin',     name: 'Lee Sin',    roles: ['Jungle'],         classes: ['Fighter', 'Assassin'],imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/LeeSin.png`,     winrate: 49.5, tier: 'A' },
    { id: 9,  key: 'Ezreal',     name: 'Ezreal',     roles: ['Bot'],            classes: ['Marksman', 'Mage'],   imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Ezreal.png`,     winrate: 50.1, tier: 'B' },
    { id: 10, key: 'Leona',      name: 'Leona',      roles: ['Support'],        classes: ['Tank', 'Support'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Leona.png`,      winrate: 51.8, tier: 'A' },
    { id: 11, key: 'Garen',      name: 'Garen',      roles: ['Top'],            classes: ['Fighter', 'Tank'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Garen.png`,      winrate: 51.0, tier: 'B' },
    { id: 12, key: 'Vi',         name: 'Vi',         roles: ['Jungle'],         classes: ['Fighter', 'Tank'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Vi.png`,         winrate: 50.7, tier: 'B' },
    { id: 13, key: 'Ashe',       name: 'Ashe',       roles: ['Bot'],            classes: ['Marksman', 'Support'],imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Ashe.png`,       winrate: 51.3, tier: 'A' },
    { id: 14, key: 'Katarina',   name: 'Katarina',   roles: ['Mid'],            classes: ['Assassin', 'Mage'],   imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Katarina.png`,   winrate: 50.4, tier: 'B' },
    { id: 15, key: 'Darius',     name: 'Darius',     roles: ['Top'],            classes: ['Fighter', 'Tank'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Darius.png`,     winrate: 51.9, tier: 'A' },
    { id: 16, key: 'Orianna',    name: 'Orianna',    roles: ['Mid'],            classes: ['Mage'],               imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Orianna.png`,    winrate: 51.1, tier: 'A' },
    { id: 17, key: 'Jhin',       name: 'Jhin',       roles: ['Bot'],            classes: ['Marksman'],           imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Jhin.png`,       winrate: 52.5, tier: 'S' },
    { id: 18, key: 'Nasus',      name: 'Nasus',      roles: ['Top'],            classes: ['Fighter', 'Tank'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Nasus.png`,      winrate: 50.6, tier: 'B' },
    { id: 19, key: 'Syndra',     name: 'Syndra',     roles: ['Mid'],            classes: ['Mage', 'Assassin'],   imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Syndra.png`,     winrate: 51.4, tier: 'A' },
    { id: 20, key: 'Blitzcrank', name: 'Blitzcrank', roles: ['Support'],        classes: ['Tank', 'Support'],    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/Blitzcrank.png`, winrate: 50.3, tier: 'B' },
  ]);

  filteredChampions = computed(() => {
    const term   = this.searchTerm().toLowerCase();
    const filter = this.activeFilter();
    const picked = new Set([...this.blueTeam(), ...this.redTeam()].map(c => c.id));
    const banned = new Set(this.allBans());

    return this.allChampions().map(champ => ({
      ...champ,
      isPicked: picked.has(champ.id),
      isBanned: banned.has(champ.name),
    })).filter(champ => {
      const matchesSearch = champ.name.toLowerCase().includes(term);
      const matchesRole   = filter === 'ALL' || champ.roles.includes(filter as Role);
      return matchesSearch && matchesRole;
    });
  });

  getChampionImage(name: string): string {
    return this.allChampions().find(c => c.name === name)?.imageUrl ?? '';
  }

  tierColor(tier: Tier): string {
    const map: Record<Tier, string> = {
      S: '#FFD700', A: '#60a5fa', B: '#4ade80', C: '#9ca3af', D: '#f87171'
    };
    return map[tier];
  }

  selectChampion(champ: Champion) {
    if (champ.isPicked || champ.isBanned) return;
    const action = this.currentAction();
    if (!action) return;

    if (action.action === 'ban') {
      if (action.team === 'blue') {
        this.blueBans.update(b => [...b, champ.name]);
      } else {
        this.redBans.update(b => [...b, champ.name]);
      }
    } else {
      if (action.team === 'blue') {
        this.blueTeam.update(t => [...t, champ]);
      } else {
        this.redTeam.update(t => [...t, champ]);
      }
    }
    this.currentStep.update(s => s + 1);
  }

  removeFromTeam(champ: Champion, team: 'blue' | 'red') {
    if (team === 'blue') {
      this.blueTeam.update(list => list.filter(c => c.id !== champ.id));
    } else {
      this.redTeam.update(list => list.filter(c => c.id !== champ.id));
    }
  }

  resetDraft() {
    this.blueTeam.set([]);
    this.redTeam.set([]);
    this.blueBans.set([]);
    this.redBans.set([]);
    this.currentStep.set(0);
  }

  async runSuggestion() {
    const action = this.currentAction();
    if (!action) return;

    this.isCalculating.set(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    const allBans    = this.allBans();
    const isBlueTurn = action.team === 'blue';

    if (action.action === 'ban') {
      const result = this.minimax.suggestNextBan(
        this.blueTeam(), this.redTeam(), this.allChampions(),
        allBans, this.settings(), isBlueTurn
      );
      this.isCalculating.set(false);
      if (result) {
        this.suggestion.set({
          name:      result.champion,
          score:     result.threatScore,
          imageUrl:  this.getChampionImage(result.champion),
          forTeam:   action.team,
          isBan:     true
        });
        this.showDialog.set(true);
      }
    } else {
      const result = this.minimax.suggestNextPick(
        this.blueTeam(), this.redTeam(), this.allChampions(),
        allBans, this.settings(), isBlueTurn
      );
      this.isCalculating.set(false);
      if (result) {
        this.suggestion.set({
          name:      result.champion,
          score:     result.score,
          imageUrl:  this.getChampionImage(result.champion),
          forTeam:   action.team,
          isBan:     false
        });
        this.showDialog.set(true);
      }
    }
  }

  acceptSuggestion() {
    const s = this.suggestion();
    if (s) {
      const champ = this.allChampions().find(c => c.name === s.name);
      if (champ) this.selectChampion(champ);
    }
    this.showDialog.set(false);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  readonly Math = Math;
  readonly roles: Role[] = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
  readonly roleShort: Record<Role, string> = {
    Top: 'TOP', Jungle: 'JGL', Mid: 'MID', Bot: 'BOT', Support: 'SUP'
  };
}