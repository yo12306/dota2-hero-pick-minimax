import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Hero, AlgorithmSettings } from './models/hero.model';
import { MinimaxService } from './services/minimax.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private minimax = inject(MinimaxService);

  settings = signal<AlgorithmSettings>({
    wBase: 50,
    wCounter: 75,
    wSynergy: 25
  });

  radiantTeam = signal<Hero[]>([]);
  direTeam = signal<Hero[]>([]);

  searchTerm = signal('');
  activeFilter = signal<'ALL' | 'str' | 'agi' | 'int'>('ALL');
  isRadiantLeft = signal(true);

  constructor() {
    this.minimax.initializeData(this.allHeroes());
  }

  swapSides() {
    this.radiantTeam.set([]);
    this.direTeam.set([]);
    this.isRadiantLeft.update(v => !v);
  }
  allHeroes = signal<Hero[]>([
    { id: 1, name: 'Anti-Mage', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png' },
    { id: 2, name: 'Axe', primaryAttr: 'str', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/axe.png' },
    { id: 3, name: 'Bane', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/bane.png' },
    { id: 4, name: 'Crystal Maiden', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/crystal_maiden.png' },
    { id: 5, name: 'Juggernaut', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/juggernaut.png' },
    { id: 6, name: 'Lina', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/lina.png' },
    { id: 7, name: 'Pudge', primaryAttr: 'str', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/pudge.png' },
    { id: 8, name: 'Sniper', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/sniper.png' },
    { id: 9, name: 'Sven', primaryAttr: 'str', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/sven.png' },
    { id: 10, name: 'Zeus', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/zuus.png' },
    { id: 11, name: 'Earthshaker', primaryAttr: 'str', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/earthshaker.png' },
    { id: 12, name: 'Mirana', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/mirana.png' },
    { id: 13, name: 'Shadow Fiend', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/nevermore.png' },
    { id: 14, name: 'Morphling', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/morphling.png' },
    { id: 15, name: 'Phantom Lancer', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/phantom_lancer.png' },
    { id: 16, name: 'Puck', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/puck.png' },
    { id: 17, name: 'Storm Spirit', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/storm_spirit.png' },
    { id: 18, name: 'Tiny', primaryAttr: 'str', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/tiny.png' },
    { id: 19, name: 'Vengeful Spirit', primaryAttr: 'agi', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/vengefulspirit.png' },
    { id: 20, name: 'Windranger', primaryAttr: 'int', imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/windrunner.png' }
  ]);

  filteredHeroes = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const filter = this.activeFilter();
    const pickedIds = [...this.radiantTeam(), ...this.direTeam()].map(h => h.id);

    return this.allHeroes().map(hero => ({
      ...hero,
      isPicked: pickedIds.includes(hero.id)
    })).filter(hero => {
      const matchesSearch = hero.name.toLowerCase().includes(term);
      const matchesAttr = filter === 'ALL' || hero.primaryAttr === filter;
      return matchesSearch && matchesAttr;
    });
  });

  selectHero(hero: Hero) {
    if (hero.isPicked) return;

    const radLen = this.radiantTeam().length;
    const direLen = this.direTeam().length;

    if (radLen < 5 && (radLen <= direLen)) {
      this.radiantTeam.update(list => [...list, hero]);
    } else if (direLen < 5) {
      this.direTeam.update(list => [...list, hero]);
    } else {
      alert('ทีมเต็มแล้ว หรือลำดับการเลือกไม่ถูกต้อง');
    }
  }

  removeHero(hero: Hero, team: 'radiant' | 'dire') {
    if (team === 'radiant') {
      this.radiantTeam.update(list => list.filter(h => h.id !== hero.id));
    } else {
      this.direTeam.update(list => list.filter(h => h.id !== hero.id));
    }
  }

  resetDraft() {
    this.radiantTeam.set([]);
    this.direTeam.set([]);
  }

  startSimulation() {
    const radLen = this.radiantTeam().length;
    const direLen = this.direTeam().length;
    const isRadiantTurn = radLen <= direLen;

    const result = this.minimax.suggestNextPick(
      this.radiantTeam(),
      this.direTeam(),
      this.allHeroes(),
      this.settings(),
      isRadiantTurn
    );

    if (result) {
      console.log(`AI แนะนำ: ${result.hero} (Score: ${result.score.toFixed(2)})`);
      alert(`AI แนะนำให้เลือก: ${result.hero}\nEstimated Score: ${result.score.toFixed(2)}`);
    }
  }
}
