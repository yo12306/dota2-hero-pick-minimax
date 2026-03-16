# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200
npm run build      # Production build to dist/
npm run watch      # Watch mode dev build
npm test           # Unit tests with Karma
```

## Architecture

Angular 19 standalone-component SPA for Dota 2 hero draft optimization. No routing — single page with three columns: Radiant team | Settings/Controls | Dire team.

**Core files:**
- `src/app/app.component.ts` — All draft state (teams, settings, hero selection, dialog) managed via Angular signals. Calls minimax service to get suggestions.
- `src/app/app.component.html` — 3-column layout template with score bar, hero picker grid, and suggestion dialog.
- `src/app/services/minimax.service.ts` — Minimax with alpha-beta pruning (depth=6, branching=6). Scores draft states using weighted formula across base winrate, counter matchups, and team synergy.
- `src/app/models/hero.model.ts` — `Hero`, `AlgorithmSettings`, `MatchupTable`, `DraftState` interfaces.

**Algorithm:** The minimax evaluator in `minimax.service.ts` computes a score for each draft state with three configurable weights (`W_BASE`, `W_COUNTER`, `W_SYNERGY`). Alpha-beta pruning limits the search tree. The algorithm runs in the browser — no backend.

**Hero data:** 20 hardcoded heroes with mock winrates (45–55%), counter tables, and synergy data. Hero images come from the official Dota 2 CDN.

**UI stack:** PrimeNG 19 (components/theme), Tailwind CSS 4 (utility classes), dark Dota 2 aesthetic (gold primary, green Radiant, red Dire).