
# Major Overhaul — Phased Rollout (with admin-controlled Phase 2 release)

Phase 1 ships fully built. **Phase 2 code also ships in this build but stays hidden behind admin-controlled feature flags** — flip a switch tomorrow and shop / cosmetics / tab cloaking go live for everyone instantly.

---

## Phase 1 — Foundation (live immediately)

### 1. Real account system
- Convert each existing access code → account row. Code becomes the password hash; first login forces user to **pick a permanent username** (unique). Admin codes convert to admin accounts.
- `accounts` table: `id, username, password_hash, role, points, total_earned, chat_count, streak_days, last_chat_at, muted_until, banned, settings, inventory, equipped, must_set_username`.
- Granular `permissions` + `account_permissions`.
- Sessions tied to `account_id`. Logout, multi-device, real-time termination preserved.
- Login screen gets Register tab (admin-disableable). Zod validation, bcrypt via pgcrypto.
- Favorites, recents, points, inventory keyed to `account_id` (existing tables get `account_id` column, backfilled from `code_id`).

### 2. Chat upgrade
- Username + cube avatar (deterministic from username hash) on every message.
- Sent vs received alignment, distinct bubbles.
- **Auto-clear every 24h** via pg_cron — points untouched, only `chat_messages` rows purged.
- Anti-spam: rate limit, duplicate-flood detection, profanity filter, mute system.
- Report button → admin queue.
- Image/GIF upload UI shipped + storage bucket created, gated by permission.
- Realtime preserved.

### 3. Points & quests economy
- Earn from chatting (diminishing returns + cooldown), daily login streak, poll votes, quest completion, tracked game plays.
- **Daily quests** (3/day, rotate 00:00) and **weekly quests** (5/week, rotate Monday). Tables: `quests`, `quest_progress`.
- Admin: create quest templates, manage rotation pool.
- Leaderboards: top all-time + this week.

### 4. Scheduled 2x points events
- `MultiplierAdmin` wired to real `point_multipliers` table. Edge function applies highest active multiplier. Fully automatic.

### 5. Weekly polls scheduler
- Recurring weekly poll templates. Cron auto-posts Monday, closes + archives Sunday. Voting awards points + counts toward weekly quest.

### 6. Announcements + Update Log
- `announcements`: severity, dismissable, active. **Non-dismissable** = full-screen blocking modal until acknowledged (per account).
- `update_logs`: latest entry pops up on first login after publish, then archived in "What's New".
- Admin composer with markdown preview.

### 7. Update Notes system (admin-authored, auto-shown)
- Dedicated `update_logs` table: `id, version, title, body_md, highlights (jsonb array of bullet points), severity, published_at, published_by, target ('all'|'admins'), require_ack`.
- **Admin "Update Notes" tab** in admin panel: rich composer (title, semver-style version, highlights list, full markdown body, optional banner image), live preview, draft → publish workflow.
- On publish: every account gets a pending entry in `update_log_acks`. Next time they load the app, a polished modal pops up showing the latest unread note (with a "What's New ✨" header, highlights as a checklist, full body collapsible). They click "Got it" → ack recorded → won't show again.
- If `require_ack = true`, modal is non-dismissable until acknowledged (same UX as critical announcements).
- Users can reopen any past update note from a **"What's New" button** in the header (badge shows count of unread).
- First post-Phase-1 update note is auto-seeded so every existing user sees the "Welcome to Accounts" walkthrough on first login.
- Phase 2 flip tomorrow can be paired with a new update note announcing shop/cosmetics — published from the same composer.

### 8. Admin panel additions
- Tabs: Accounts, Quests, Multipliers, Announcements, **Update Notes**, Reports queue, **Feature Flags** + existing Live/Analytics/Polls.
- All actions audit-logged.

### 9. Keyboard shortcut
- Global `Ctrl+Shift+G` toggles the games portal.

---

## Phase 2 — Ships dark, you flip tomorrow

Built in this same release, wrapped in feature flags. `feature_flags` table is admin-editable from the **Feature Flags** tab — toggle on/off, scope to "everyone" or "admin-only preview", schedule a future activation time. Frontend listens via realtime; flips are instant for every connected user.

Flags shipped:
- `shop_enabled` — full shop UI + inventory + equip system. Categories: chat power perks, economy perks, access perks, vanity & flex perks. (Pack discounts excluded — packs come in Phase 4.)
- `cosmetics_enabled` — username colors, animated tags, cube avatar variants, badges, custom join sounds, pin-own-message, message highlights.
- `image_uploads_enabled` — flips chat image/GIF gate to honor shop purchases.
- `tab_cloaking_enabled` — tab title swap, favicon swap, presets (Google Docs / Classroom / Drive / blank), per-account preference.
- `code_renaming_enabled` — neutralizes overt game references via centralized string map.
- `beta_games_enabled` — gates exclusive shop-locked games.

Flip `shop_enabled` + `cosmetics_enabled` + `tab_cloaking_enabled` tomorrow → publish a paired update note from the Update Notes tab → users see the modal and the new features at the same time. No redeploy.

---

## Phase 3 (later) — Gambling + Stocks
Coinflip, dice, slots, jackpot. Stone-weighted soft limits (house edge ramps above thresholds; max 25% of balance per bet). 200-message gate. Admin-manipulable stock market (set price, trigger crash/boom, schedule volatility). Daily loss cap. Behind `gambling_enabled` flag.

## Phase 4 (later) — Blooket-style Packs + Front-Page Overhaul
Pack rarities, opening animations, collectible cube avatars, dust/reroll, animated rares. Front page: featured events, active users, trending packs, announcements banner, chat/profile previews, motion sections, mobile polish.

---

## Technical notes

**New / changed tables**
```text
accounts, permissions, account_permissions,
quests, quest_progress,
point_multipliers, point_transactions,
announcements, announcement_acks,
update_logs, update_log_acks,
chat_reports, weekly_poll_templates,
feature_flags, audit_logs
```
- Existing tables get `account_id` column (backfilled from `code_id`); `access_codes` retained for migration period.
- All RLS stays "no direct access" — every mutation via `game-api` edge function with token validation.
- Extensions: `pgcrypto` (bcrypt), `pg_cron` + `pg_net` (24h chat purge, daily/weekly quest rotation, poll rotation, multiplier checks).
- Storage bucket `chat-uploads` (5MB, image/* + gif, write via edge function only).

**Frontend**
- New: `AuthScreen`, `AnnouncementModal`, `UpdateNoteModal`, `WhatsNewPanel`, `QuestsPanel`, `LeaderboardPanel`, `ProfilePanel`, upgraded `ChatPanel`.
- Phase-2 flag-gated: `ShopPanel`, `InventoryPanel`, `CosmeticsPicker`, `TabCloakSettings`.
- Admin: `AccountsAdmin`, `QuestsAdmin`, `AnnouncementsAdmin`, `UpdateNotesAdmin`, `ReportsAdmin`, `FeatureFlagsAdmin`.
- Hooks: `useGlobalShortcut`, `useFeatureFlag`, `useUnreadUpdateNotes`.

---

Approve and I'll build Phase 1 + dark-shipped Phase 2 together.
