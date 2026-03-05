

## Problem

The FNF mods from `fnfgo.com` are blocked by Cloudflare verification when loaded in iframes, so they show a blank/loading screen. Same issue affects `fnfmods.xyz`. These sites cannot be embedded.

## Solution

Mark **all Nathaniel's Corner FNF mods** as `openInNewTab: true` so they open directly in a new browser tab (same approach already working for Bentley's AI tools). This is the only reliable way since all these game sites use anti-iframe protections.

### Changes
- **File**: `src/components/AnythingButWork.tsx`
- Add `openInNewTab: true` to every Nathaniel's Corner item (~31 items)
- Users click a mod → it opens in a new tab → plays directly on fnfgo.com/fnfmods.xyz

This is a quick, single-file change.

