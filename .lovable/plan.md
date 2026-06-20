## Casino, Economy, Chat Moderation & Admin Overhaul

### 1. Point Earning Fixes (anti-farming)
- **Poll voting**: award **20 pts** only for the **first poll vote per UTC day** per account. Subsequent votes same day = 0 pts (still allowed).
- **Requests**: award **20 pts** only for the **first request submission per UTC day**. Spam-prevention: still rate-limited but no points.
- Track via new `daily_point_claims` table: `(account_id, claim_key, claim_date)` unique. Keys: `poll_vote`, `request_submit`.
- Audit the edge function for any other unintended point sources (chat message bonuses, etc.) and gate them similarly.

### 2. Admin Economy & Event Controls
- Admin panel additions:
  - **Give / Take points** form (already in API as `adminAdjustPoints`) — surface a clean UI: pick user, +/- amount, note.
  - **Run Point Events**: 2x / 3x / 5x multipliers with custom duration (15m, 1h, 6h, 24h, custom). Uses existing `point_multipliers` + `apiCreateMultiplier`. Add quick-launch buttons.
  - Show currently-active multiplier with end timer + "End now" button.

### 3. Casino — Pity System
- New `gamble_pity` table: `(account_id, tier, loss_streak, total_lost_streak)`.
- Tiered by wager:
  - **Small** (1–49): every 10th consecutive loss → refund 10% of total lost in that streak.
  - **Mid** (50–499): every 10th loss → refund 15%.
  - **Big** (500+): every 10th loss → refund 25%.
- Streak resets on any win. Tier determined by wager of the current roll. Refund shown in UI as "🛡️ Pity bonus: +X pts".

### 4. Casino UI/UX Overhaul (animations + polish)
- Coinflip: spinning coin animation (CSS 3D rotateY) lands on result.
- Dice: tumbling dice with face flip.
- Slots: reels spin independently and snap to symbols, win highlight glow.
- Win = confetti burst + green pulse; Loss = red shake.
- New balance counter that animates count-up/down.
- Pity progress bar showing "losses until next pity (X/10)" per tier.
- Recent results strip showing last 10 outcomes.
- Better layout: gradient backgrounds, neon accents, sound-ready hooks (no audio added unless requested).

### 5. Profile: Remove Shop
- Delete the **Shop tab** from `ProfilePanel.tsx`. Cosmetics are obtained only via **Packs** (preserves crate value).
- Keep Inventory tab (shows owned items, equip controls).
- Leave `shopList`/`shopBuy` API endpoints in place but unreferenced (or remove entry points). Items remain in `shop_items` as the pack drop pool.

### 6. Chat Moderation
- **Admin actions** on any chat user (via clicking a username in chat or admin panel):
  - Timeout (5m / 15m / 1h / 24h / custom) — uses existing `muted_until` on accounts.
  - Suspend from chat (indefinite mute until lifted).
  - Delete message (exists).
  - Ban (exists).
  - **Promote to Moderator** / Demote.
- **Moderator role**: new role `'moderator'` on accounts. Moderators can:
  - Timeout users (max 24h).
  - Delete chat messages.
  - Adjust points within a capped range (e.g. ±100, configurable).
  - Cannot promote others, cannot ban, cannot run events.
- Server-side `has_permission` / role checks added to every moderator-eligible action.
- Mod-log entries to `audit_logs` for all actions.
- Chat UI: badge next to username (👑 admin / 🛡️ mod), context menu on usernames for admins/mods.

### Technical Section
- **DB migration**:
  - `daily_point_claims (account_id uuid, claim_key text, claim_date date, primary key(account_id, claim_key, claim_date))` + grants.
  - `gamble_pity (account_id, tier text, loss_streak int, total_lost int, updated_at)` + grants.
  - Add `'moderator'` to role check or treat role as free text (already text).
- **Edge function `game-api`** changes:
  - `votePoll`, `submitRequest`: wrap point award in daily-claim check.
  - `gamble`: compute tier, update pity streak, on 10th consecutive loss compute refund, return `pityBonus` in response.
  - New actions: `adminTimeout`, `adminSetRole` (admin↔moderator↔user), `modAdjustPoints` (capped), `modTimeout` (capped), `adminEndMultiplier` (exists).
- **Client**:
  - `GamblingGames.tsx`: full rewrite for animations + pity UI + recent strip.
  - `AdminPanel.tsx`: add Economy + Events + Moderation tabs/sections.
  - `ChatPanel.tsx`: username context menu, role badges, timeout/suspend UI.
  - `ProfilePanel.tsx`: remove Shop tab.
  - New `api.ts` helpers for new actions.

### Out of scope (ask later)
- Sounds, leaderboard for gambling, jackpot/progressive prizes.

Confirm and I'll build it all in one pass.
