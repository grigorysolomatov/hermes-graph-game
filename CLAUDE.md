# hermes-graph-game

Standalone Svelte 5 + Vite game. See DESIGN.md for the full game spec.

## Design system
- Dark theme only: background #0a0a0a, surfaces #111, borders #222, text #e8e8e8
- Accent: #7c3aed (violet) for interactive elements
- Mobile-first: touch targets ≥ 48px, works on 375px wide screen
- No hover-only interactions, no right-click, no keyboard-only shortcuts
- Global CSS: * { -webkit-tap-highlight-color: transparent; user-select: none }

## Entry point
src/App.svelte — this IS the game, no router needed.
