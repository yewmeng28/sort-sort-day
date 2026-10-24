# Sort Sort Day

Slightly silly sorting system: a room map of mergeable grid cells and layers, where you record which items live in which storage space, search for them, and get tidy-up suggestions. A React + TypeScript PWA, all data on-device in IndexedDB.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # domain logic (grid merge, search, suggestions)
npm run build
```

## Layout

- `src/domain/`: pure logic and types (grid merge, search, suggestion rules), unit-tested
- `src/data/`: repository interfaces and the Dexie (IndexedDB) implementation; swap `RepoProvider`'s `repositories` to change storage
- `src/features/`: map editor, space detail, search, sort suggestions, the Den (missing items, backup)
- `src/app/sound.ts`: synthesized UI sounds

## Install on iPhone

Host over HTTPS, open in Safari, Share → Add to Home Screen. Installed PWAs keep their data longest, and Den → Export backup is your safety net.
