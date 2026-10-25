# Sort Sort Day

Slightly silly sorting system: map each room of the house as a grid of mergeable cells and layers, record which items live in which storage space, search for them, and work through tidy-up quests while Bandit the cat "borrows" things. A React + TypeScript PWA, all data on-device in IndexedDB.

Live at https://yewmeng28.github.io/sort-sort-day/ (deployed by GitHub Actions on every push to `main`).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # domain logic: grid, rooms, search, quests, progress, backup validation
npm run build
npm run icons    # render public/icon.svg to the PNG icons (or: npm run icons -- other.svg)
```

## Layout

- `src/domain/`: pure logic and types, unit-tested
  - `grid.ts` merge/unmerge, outlines, labels; `rooms.ts` room editing, moving spaces, moving items
  - `suggestions.ts` quests within and between rooms; `progress.ts` packing score, streak, XP and levels
  - `search.ts`, `categories.ts`, `backup.ts` (validates imports)
- `src/data/`: repository interfaces and the Dexie (IndexedDB) implementation; swap `RepoProvider`'s `repositories` to change storage
- `src/features/`: map editor, rooms, space detail, search, quests and progress, the Den (missing items, categories, backup)
- `src/app/`: synthesized UI sounds and the mascot
- `public/`: app icon (`icon.svg` plus generated PNGs) and `mascot.svg`

## Install on iPhone

Open the live URL in Safari, Share → Add to Home Screen. Installed PWAs keep their data longest, and Den → Export backup is your safety net (keep exports in the gitignored `backups/` folder). iOS caches the home-screen icon at install, so re-add the app after an icon change.
