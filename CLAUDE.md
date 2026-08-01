@AGENTS.md

## Claude-specific

- The game wiki (`docs/wiki/game/`) is the fastest way to understand what the
  game *is* before changing gameplay. `docs/wiki/tech/architecture.md` is the
  file map.
- Use the `wiki-audit` skill after a refactor to check whether the prose in the
  wiki is still true. It reports; it does not auto-commit.
- Testing on a phone works over Tailscale: `npm run dev:host`, then
  `http://100.99.168.101:5173`.
