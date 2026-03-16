# Plan: League of Legends Champion Pick — Minimax Features

## Overview

Adapt the Dota 2 hero draft minimax app to support League of Legends champion drafting, using LoL-specific game mechanics (roles, ban phase, draft order).

---

## Key Differences from Dota 2

| Aspect | Dota 2 (current) | League of Legends (target) |
|--------|-----------------|---------------------------|
| Teams | Radiant / Dire | Blue / Red |
| Hero attributes | str / agi / int / uni | Marksman / Mage / Assassin / Tank / Support / Fighter |
| Draft order | Free pick | Alternating with ban phases (B/B/B → P/P → B/B → P/P/P → B/B → P/P/P) |
| Ban phase | Not modeled | 5 bans per team (10 total) |
| Roles | None | Top / Jungle / Mid / Bot / Support |
| Champion pool | 20 hardcoded | 160+ champions (data from Riot API) |

---

## Features

### 1. Champion Data

- **Model update** — Extend `Hero` interface:
  ```ts
  export interface Champion {
    id: string;           // Riot champion key (e.g. "Jinx")
    name: string;
    roles: Role[];        // ['Marksman', 'Support', ...]
    imageUrl: string;     // from Riot Data Dragon CDN
    winrate?: number;
    tier?: 'S' | 'A' | 'B' | 'C' | 'D';
    isBanned?: boolean;
    isPicked?: boolean;
  }
  ```
- **Data source** — Fetch champion list + images from Riot Data Dragon API (`https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json`)
- **Winrate/counter data** — Load from a static JSON seeded with real patch data (e.g., from lolalytics or u.gg export), fallback to mock data

### 2. Ban Phase Support

- Add `bannedChampions: string[]` to `DraftState`
- Implement LoL standard draft order:
  1. Blue bans 3 → Red bans 3
  2. Blue picks 1 → Red picks 2 → Blue picks 2
  3. Red bans 2 → Blue bans 2
  4. Red picks 3 → Blue picks 2 → Red picks 1
- Minimax should evaluate ban moves (remove strong counter-picks from the pool)
- Add `AlgorithmSettings.wBan` weight to control how aggressively the algorithm bans

### 3. Role Assignment
- Add a role slot system: each team has 5 role slots (Top, Jungle, Mid, Bot, Support)
- After a champion is picked, allow assigning them to a role
- Scoring bonus for picking a champion in their primary role
- Warn when a team has duplicate roles or unfilled roles

### 4. Minimax Evaluation Update

Current scoring formula:
```
score = W_BASE * winrate + W_COUNTER * counterScore + W_SYNERGY * synergyScore
```

Extended formula for LoL:
```
score = W_BASE * winrate
      + W_COUNTER * counterScore
      + W_SYNERGY * synergyScore
      + W_ROLE * roleMatchBonus
      - W_BAN * bannedThreatPenalty
```

- **roleMatchBonus** — +score if picked champion matches assigned role
- **bannedThreatPenalty** — reduce opponent's potential counter score based on what got banned

### 5. UI Changes

- **Team labels** — Replace "Radiant" / "Dire" with "Blue Side" / "Red Side"
- **Role icons** — Show role icons next to each pick slot
- **Ban display** — Add a ban strip above each team's picks (5 champion portraits, greyed out)
- **Draft phase indicator** — Show current phase (Ban Phase 1 / Pick Phase 1 / etc.) and whose turn it is
- **Champion filter** — Filter by role, tier, or name
- **Tier badge** — Show S/A/B/C/D tier badge on each champion card

### 6. Settings Panel Updates

- Add `W_BAN` weight slider
- Add `W_ROLE` weight slider
- Add "Patch version" selector (for Data Dragon API version)
- Add toggle: "Use real winrate data" vs "mock data"

---

## Implementation Order

1. Update data model (`hero.model.ts` → `champion.model.ts`)
2. Integrate Riot Data Dragon API for champion list + images
3. Load static counter/synergy/winrate JSON
4. Implement ban phase draft order in `minimax.service.ts`
5. Update scoring formula with role and ban weights
6. Update UI — team labels, ban strip, phase indicator
7. Add role assignment to pick slots
8. Add champion filters (role, tier)

---

## Data Sources

- Champion list + images: `https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json`
- Latest patch version: `https://ddragon.leagueoflegends.com/api/versions.json`
- Counter/winrate data: static JSON file derived from community sources (lolalytics, u.gg)
