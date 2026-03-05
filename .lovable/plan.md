

## Plan: Replace Nathaniel's Corner FNF Mods with Working Links + Fix Other Broken Items

### Problem
All FNF mod URLs point to `fnf-mods.net` which doesn't exist. AI tools and Granny also fail because those sites block iframes.

### Sources Found
From the user-provided sites, two have playable browser-based FNF mods:
- **fnfgo.com** - Large library of playable FNF mods (50+ mods across 21 pages)
- **fnfmods.xyz** - Another playable FNF mod site with browser games

### Changes to `src/components/AnythingButWork.tsx`

**1. Replace all Nathaniel's Corner items** with working URLs from fnfgo.com and fnfmods.xyz. New list (~30 mods):

| Mod | Source |
|-----|--------|
| FNF Full Week | fnfgo.com/fnf-full-week/ |
| FNF vs Tricky HD | fnfgo.com/vs-tricky-full-hd/ |
| FNF vs Whitty | fnfgo.com/vs-whitty-full-week/ |
| FNF vs Garcello | fnfgo.com/vs-garcello/ |
| FNF vs Hex | fnfgo.com/fnf-vs-hex-mod-full-week/ |
| FNF Mid-Fight Masses | fnfgo.com/sarventes-mid-fight-masses/ |
| FNF vs AGOTI | fnfgo.com/fnf-vs-agoti/ |
| FNF vs Tabi | fnfgo.com/fnf-vs-tabi-ex-boyfriend/ |
| FNF vs Shaggy v2 | fnfgo.com/vs-shaggy-v2/ |
| FNF vs Sky | fnfgo.com/vs-sky-full-week-2/ |
| FNF vs Nonsense | fnfgo.com/fnf-vs-nonsense/ |
| FNF Indie Cross | fnfgo.com/fnf-vs-indie-cross/ |
| FNF vs Sonic.EXE | fnfgo.com/fnf-vs-sonic-exe/ |
| FNF vs Huggy Wuggy | fnfgo.com/fnf-vs-huggy-wuggy-poppy-playtime/ |
| FNF Silly Billy | fnfgo.com/fnf-silly-billy/ |
| FNF vs Impostor V4 | fnfgo.com/fnf-vs-impostor-among-us-v4/ |
| FNF vs KAPI | fnfgo.com/fnf-vs-kapi/ |
| FNF Corruption | fnfgo.com/fnf-corruption/ |
| FNF vs Pibby Corrupted | fnfgo.com/fnf-vs-pibby-corrupted/ |
| FNF vs Suicide Mouse | fnfgo.com/fnf-vs-suicide-mouse-v2/ |
| FNF vs Hatsune Miku | fnfgo.com/fnf-vs-hatsune-miku/ |
| FNF vs QT | fnfgo.com/fnf-vs-qt-mod/ |
| FNF vs Doki Doki (DDLC) | fnfgo.com/fnf-vs-doki-doki-takeover-ddlc/ |
| FNF vs Mario's Madness | fnfgo.com/fnf-vs-marios-madness-v2/ |
| FNF vs Bob & Bosip | fnfgo.com/fnf-vs-bob-and-bosip-the-expansion-update/ |
| FNF vs CatNap V2 | fnfgo.com/fnf-vs-catnap-v2/ |
| FNF vs Rainbow Friends | fnfgo.com/fnf-vs-rainbow-friends/ |
| FNF Pibby Apocalypse | fnfgo.com/fnf-pibby-apocalypse/ |
| FNF Character Test Playground | fnfgo.com/fnf-character-test-playground/ |
| FNF vs Sonic.EXE (fnfmods.xyz) | fnfmods.xyz/games/friday-night-funkin-vs-sonic-exe-mod |
| FNF vs Tricky HD (fnfmods.xyz) | fnfmods.xyz/games/friday-night-funkin-vs-tricky-hd-mod |

**2. Fix Bentley's Corner (AI tools)** - Add an `openInNewTab` flag to items that block iframes (ChatGPT, Gemini, Claude, Copilot, etc.). When clicked, these open directly in a new tab instead of trying to load in an iframe.

**3. Fix Jayson's Corner** - Update Granny URLs to working alternatives, and mark items that block iframes for new-tab behavior.

**4. Add `openInNewTab` property to `CornerItem` interface** - Items with this flag will call `window.open()` on click instead of loading the iframe view.

### Technical Details
- Single file change: `src/components/AnythingButWork.tsx`
- Add `openInNewTab?: boolean` to the `CornerItem` interface
- In the click handler, check `openInNewTab` and use `window.open()` for those items
- Replace all `fnf-mods.net` URLs with fnfgo.com/fnfmods.xyz URLs
- Mark all AI tools as `openInNewTab: true` since they all block iframes

