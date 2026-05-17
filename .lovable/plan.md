## Scope

This is a multi-week overhaul touching nearly every part of the app. To keep it shippable, I'll deliver it in **5 phases**, each independently testable. You can pause/redirect between any phase.

A lot of the underlying scaffolding (accounts, sessions, chat, polls, point_multipliers, packs, gambling, economy dashboard, activity tracker, admin panel) already exists from earlier work. Most of this plan is **completing, wiring, and polishing** what's there — not building from scratch.

---

## Phase 1 — Account system hardening
- Persistent accounts with username + bcrypt password (already in `accounts` table — verify hash flow end-to-end).
- Proper login / logout / session restore (already wired via `apiLogin` / `apiValidateSession`).
- "First login with code → set permanent username + password" flow.
- Role-based permissions: replace ad-hoc `is_admin` checks with `account_permissions` lookups (table exists). Add `has_permission(account_id, key)` SQL function.
- Saved profile: display name, avatar (emoji or uploaded), bio, equipped cosmetics.
- New `/profile` view inside the games hub.

## Phase 2 — Admin panel completion
- Tabs: Users · Sessions · Chat moderation · Economy · Polls · Packs · Feature flags · Multipliers · Audit log.
- Per-account permission editor (toggle keys from `permissions` table).
- Moderation: ban / unban, mute (duration), kick session, delete message, view reports queue.
- Scheduled 2x point events: form to create `point_multipliers` rows with start/end timestamps; edge function reads active multiplier and applies to all point grants.
- Feature flags UI on `feature_flags` (already has public-read RLS).
- Audit log viewer.

## Phase 3 — Chat upgrade
- Username + avatar rendered per message; own messages right-aligned, others left-aligned (iMessage-style).
- Image / GIF upload via `chat_uploads` + Supabase storage bucket `chat-media` (new).
- Anti-spam: cooldown (3s), rate limit (10 msg/min), max length, basic profanity filter (server-side word list).
- Report button → inserts into `chat_reports`, surfaced in admin moderation tab.
- 24h auto-delete via `pg_cron` job calling a cleanup function.
- Mute enforcement via `accounts.muted_until`.

## Phase 4 — Economy, polls, packs, gambling
- **Points & streaks**: award on chat/poll/play; daily streak bonus; multiplier applied. Persist in `point_transactions` (exists).
- **Leaderboard**: top 20 by points (weekly + all-time).
- **Polls**: rewards on vote, archive view, auto-rotate weekly from `weekly_poll_templates`.
- **Shop**: cosmetics (avatars, name colors, chat badges) priced in points; purchases land in `accounts.inventory`.
- **Gambling** (already scaffolded): coinflip, slots, dice, jackpot — wire to point_transactions, add house edge limits and per-day loss cap.
- **Packs** (already scaffolded): rarities (common→legendary), seasonal packs, dupe → points refund, opening animation.

## Phase 5 — Front page redesign + stealth features
- New `MathHome` hero with modern design (you pick the direction — see next message).
- Logged-in homepage variant: featured event, online users count, trending packs, latest announcement, recent chat preview, profile/progression card.
- **CTRL+SHIFT+G** toggle: jump between math view and games view from anywhere.
- **Tab cloaking**: settings panel to swap document title + favicon (Google Docs, Khan Academy, Classroom presets + custom).
- Strip remaining "game/play" wording from public surfaces.

---

## Technical notes

- **Storage**: new bucket `chat-media` (private; signed URLs); RLS allows insert by owner-of-session, read for everyone authenticated via signed URLs from edge function.
- **Cron**: `pg_cron` + `pg_net` for chat cleanup and weekly poll rotation.
- **All writes** continue to flow through `game-api` edge function (header-auth `x-session-token`) to preserve the existing security model.
- **No new public RLS** beyond what's already approved; tables stay locked, edge function is the gate.
- **Permission keys**: `chat.moderate`, `users.manage`, `economy.manage`, `polls.manage`, `packs.manage`, `flags.manage`, `multipliers.manage`, `audit.view`. Admins implicitly hold all.

---

## What I need from you before I start

1. **Confirm phase order** above, or tell me to reprioritize (e.g. "do chat upgrade first").
2. **Front page direction**: after Phase 1–4 are done, I'll send a separate question with 3 rendered design options for the homepage. Or, if you'd rather do the redesign first, say so.
3. **Tab cloak presets**: any specific ones you want beyond Google Docs / Classroom / Khan Academy?
4. **Gambling limits**: any per-day loss cap you want, or leave it uncapped?

Reply with "go" to start Phase 1, or with adjustments.