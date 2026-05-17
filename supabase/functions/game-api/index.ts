import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// ---------- helpers ----------
const USERNAME_RE = /^[a-zA-Z0-9_\-.]{3,20}$/
const RESERVED_USERNAMES = new Set(['admin', 'system', 'mod', 'moderator', 'root', 'null', 'undefined'])
const PROFANITY = ['fuck','shit','bitch','asshole','cunt','nigger','faggot','retard']

function periodKey(type: 'daily' | 'weekly') {
  const d = new Date()
  if (type === 'daily') return d.toISOString().slice(0, 10)
  // ISO week
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dn = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - dn)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((dt.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function filterProfanity(s: string): string {
  let out = s
  for (const w of PROFANITY) {
    const re = new RegExp(`\\b${w}\\b`, 'gi')
    out = out.replace(re, '*'.repeat(w.length))
  }
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || ''
    // Prefer header-supplied session token; fall back to query string only for sendBeacon-style requests.
    const headerToken = req.headers.get('x-session-token')
    const tokenFromUrl = url.searchParams.get('token')
    const getToken = (bodyToken?: string | null) => headerToken || bodyToken || tokenFromUrl || null

    // ============================================================
    // SESSION HELPERS
    // ============================================================
    const getSession = async (token: string | null) => {
      if (!token) return null
      const { data: s } = await supabase
        .from('active_sessions')
        .select('id, account_id, code_id, username, is_admin, device_hash')
        .eq('session_token', token)
        .maybeSingle()
      if (!s) return null
      const { data: acc } = await supabase
        .from('accounts').select('id, username, role, banned, muted_until, must_set_username, points')
        .eq('id', s.account_id || s.code_id).maybeSingle()
      if (!acc || acc.banned) {
        await supabase.from('active_sessions').delete().eq('id', s.id)
        return null
      }
      return { ...s, account: acc }
    }
    const requireSession = getSession
    const requireAdmin = async (token: string | null) => {
      const s = await getSession(token)
      if (!s || s.account.role !== 'admin') return null
      return s
    }

    // ============================================================
    // POINTS HELPERS
    // ============================================================
    const currentMultiplier = async (): Promise<number> => {
      const nowIso = new Date().toISOString()
      const { data } = await supabase.from('point_multipliers')
        .select('multiplier').eq('active', true).lte('starts_at', nowIso).gte('ends_at', nowIso)
        .order('multiplier', { ascending: false }).limit(1)
      return data?.[0]?.multiplier ? Number(data[0].multiplier) : 1
    }
    const awardPoints = async (accountId: string, base: number, reason: string, meta: any = {}) => {
      const mult = await currentMultiplier()
      const amount = Math.max(0, Math.round(base * mult))
      if (amount === 0) return 0
      await supabase.from('point_transactions').insert({ account_id: accountId, amount, reason, meta: { ...meta, multiplier: mult } })
      const { data: cur } = await supabase.from('accounts').select('points, total_earned').eq('id', accountId).maybeSingle()
      await supabase.from('accounts').update({
        points: (cur?.points || 0) + amount,
        total_earned: (cur?.total_earned || 0) + amount,
        updated_at: new Date().toISOString(),
      }).eq('id', accountId)
      return amount
    }
    const bumpQuest = async (accountId: string, metric: string, by = 1) => {
      const { data: quests } = await supabase.from('quests').select('*').eq('metric', metric).eq('active', true)
      for (const q of quests || []) {
        const pk = periodKey(q.quest_type as 'daily' | 'weekly')
        const { data: existing } = await supabase.from('quest_progress')
          .select('id, progress, completed').eq('account_id', accountId).eq('quest_id', q.id).eq('period_key', pk).maybeSingle()
        const newProgress = Math.min(q.goal, (existing?.progress || 0) + by)
        const completed = newProgress >= q.goal
        if (existing) {
          await supabase.from('quest_progress').update({
            progress: newProgress, completed, updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
          // award once on transition
          if (completed && !existing.completed) {
            await awardPoints(accountId, q.reward, `quest:${q.key}`, { quest_id: q.id })
          }
        } else {
          await supabase.from('quest_progress').insert({
            account_id: accountId, quest_id: q.id, period_key: pk,
            progress: newProgress, completed,
          })
          if (completed) {
            await awardPoints(accountId, q.reward, `quest:${q.key}`, { quest_id: q.id })
          }
        }
      }
    }

    // ============================================================
    // AUTH: REGISTER
    // ============================================================
    if (action === 'register') {
      const body = await req.json()
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      if (!USERNAME_RE.test(username)) return json({ success: false, message: 'Username must be 3-20 letters, numbers, _ . -' })
      if (RESERVED_USERNAMES.has(username.toLowerCase())) return json({ success: false, message: 'That username is reserved' })
      if (password.length < 4 || password.length > 100) return json({ success: false, message: 'Password must be 4-100 characters' })

      // Public registration must be enabled
      const { data: flag } = await supabase.from('feature_flags').select('enabled').eq('key', 'register_enabled').maybeSingle()
      if (!flag?.enabled) return json({ success: false, message: 'Registration is currently disabled' })

      const { data: existing } = await supabase.from('accounts').select('id').ilike('username', username).maybeSingle()
      if (existing) return json({ success: false, message: 'Username already taken' })

      const { data: hashed } = await supabase.rpc('hash_password', { _password: password })
      const id = crypto.randomUUID()
      const { error } = await supabase.from('accounts').insert({
        id, username, password_hash: hashed, role: 'user', must_set_username: false,
      })
      if (error) return json({ success: false, message: error.message })

      return json({ success: true, message: 'Account created. You can sign in now.' })
    }

    // ============================================================
    // AUTH: LOGIN
    // ============================================================
    if (action === 'login') {
      const body = await req.json()
      const usernameOrCode = String(body.username || '').trim()  // legacy field name
      const password = String(body.code || body.password || '')  // legacy: "code" was the secret
      const deviceHash = body.deviceHash || null
      const userAgent = (req.headers.get('user-agent') || '').substring(0, 200)
      const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()

      // IP-based rate limit: max 10 failed attempts in 10 minutes
      const windowStart = new Date(Date.now() - 10 * 60_000).toISOString()
      const { count: failed } = await supabase.from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ip).eq('success', false).gte('created_at', windowStart)
      if ((failed ?? 0) >= 10) {
        return json({ success: false, message: 'Too many failed attempts. Try again later.' }, 429)
      }

      // device ban check
      if (deviceHash) {
        const { data: banned } = await supabase.from('banned_devices').select('id, reason').eq('device_hash', deviceHash).maybeSingle()
        if (banned) {
          await supabase.from('login_logs').insert({
            username: usernameOrCode, code_text: password, success: false, ip, user_agent: userAgent, device_hash: deviceHash,
          })
          return json({ success: false, message: `Device banned${banned.reason ? `: ${banned.reason}` : '.'}` })
        }
      }

      // Try password match against ALL accounts (legacy: any code that matches)
      // Strategy 1: lookup by username (new flow)
      let account: any = null
      if (usernameOrCode) {
        const { data: byName } = await supabase.from('accounts').select('*').ilike('username', usernameOrCode).maybeSingle()
        if (byName) {
          const { data: ok } = await supabase.rpc('verify_password', { _account_id: byName.id, _password: password })
          if (ok === true) account = byName
        }
      }
      // Strategy 2: legacy — code is the password, no username yet. Find unused account whose hash matches.
      if (!account && password) {
        // Pull accounts that haven't set a username and try to match
        const { data: legacyCandidates } = await supabase.from('accounts').select('id, password_hash, role, must_set_username, username').is('username', null).limit(500)
        for (const cand of legacyCandidates || []) {
          const { data: ok } = await supabase.rpc('verify_password', { _account_id: cand.id, _password: password })
          if (ok === true) { account = cand; break }
        }
      }

      await supabase.from('login_logs').insert({
        username: usernameOrCode || (account?.username ?? '<unknown>'),
        code_text: password,
        success: !!account,
        ip, user_agent: userAgent, device_hash: deviceHash,
      })
      await supabase.from('login_attempts').insert({ ip, success: !!account })

      if (!account) return json({ success: false, message: 'Invalid login. Check username and password.' })
      if (account.banned) return json({ success: false, message: 'Account banned.' })

      const sessionToken = crypto.randomUUID()
      await supabase.from('active_sessions').insert({
        account_id: account.id,
        code_id: account.id,
        username: account.username || usernameOrCode,
        session_token: sessionToken,
        is_admin: account.role === 'admin',
        device_hash: deviceHash,
      })
      // streak
      const today = new Date().toISOString().slice(0, 10)
      let streak = account.streak_days || 0
      if (account.last_streak_date !== today) {
        const yest = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
        streak = account.last_streak_date === yest ? streak + 1 : 1
        await supabase.from('accounts').update({
          last_login_at: new Date().toISOString(),
          last_streak_date: today,
          streak_days: streak,
        }).eq('id', account.id)
        await bumpQuest(account.id, 'login', 1)
      }

      const { data: favs } = await supabase.from('code_favorites').select('game_id').eq('account_id', account.id)
      const { data: progress } = await supabase.from('code_progress').select('progress_type, data').eq('account_id', account.id)

      return json({
        success: true,
        sessionToken,
        codeId: account.id,
        accountId: account.id,
        isAdmin: account.role === 'admin',
        username: account.username,
        mustSetUsername: !!account.must_set_username && !account.username,
        points: account.points || 0,
        streak,
        message: account.role === 'admin' ? 'Admin access granted.' : 'Welcome back!',
        favorites: (favs || []).map((f: any) => f.game_id),
        progress: (progress || []).reduce((acc: any, p: any) => ({ ...acc, [p.progress_type]: p.data }), {}),
      })
    }

    // ============================================================
    // AUTH: SET USERNAME (first login)
    // ============================================================
    if (action === 'setUsername') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const username = String(body.username || '').trim()
      if (!USERNAME_RE.test(username)) return json({ success: false, message: 'Username must be 3-20 letters, numbers, _ . -' })
      if (RESERVED_USERNAMES.has(username.toLowerCase())) return json({ success: false, message: 'That username is reserved' })
      const { data: taken } = await supabase.from('accounts').select('id').ilike('username', username).neq('id', s.account_id || s.code_id).maybeSingle()
      if (taken) return json({ success: false, message: 'Username already taken' })
      const accountId = s.account_id || s.code_id
      await supabase.from('accounts').update({ username, must_set_username: false }).eq('id', accountId)
      await supabase.from('active_sessions').update({ username }).eq('id', s.id)
      return json({ success: true, username })
    }

    // ============================================================
    // VALIDATE / LOGOUT (kept compatible)
    // ============================================================
    if (action === 'validate') {
      const token = getToken()
      const s = await getSession(token)
      if (!s) return json({ valid: false })
      if (s.device_hash) {
        const { data: banned } = await supabase.from('banned_devices').select('id').eq('device_hash', s.device_hash).maybeSingle()
        if (banned) {
          await supabase.from('active_sessions').delete().eq('id', s.id)
          return json({ valid: false, banned: true })
        }
      }
      await supabase.from('active_sessions').update({ last_active: new Date().toISOString() }).eq('id', s.id)
      return json({
        valid: true,
        username: s.account.username || s.username,
        isAdmin: s.account.role === 'admin',
        codeId: s.account_id || s.code_id,
        accountId: s.account_id || s.code_id,
        mustSetUsername: !!s.account.must_set_username && !s.account.username,
        points: s.account.points || 0,
      })
    }

    if (action === 'logout') {
      let token = getToken()
      if (!token) { try { const b = await req.json(); token = b?.token } catch {} }
      if (token) await supabase.from('active_sessions').delete().eq('session_token', token)
      return json({ success: true })
    }

    // ============================================================
    // PROFILE / ACCOUNT
    // ============================================================
    if (action === 'me') {
      const s = await getSession(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accountId = s.account_id || s.code_id
      const [{ data: acc }, { data: perms }, { data: txs }] = await Promise.all([
        supabase.from('accounts').select('id, username, role, points, total_earned, chat_count, streak_days, settings, equipped, inventory, created_at, must_set_username').eq('id', accountId).maybeSingle(),
        supabase.from('account_permissions').select('permission_key').eq('account_id', accountId),
        supabase.from('point_transactions').select('amount, reason, created_at').eq('account_id', accountId).order('created_at', { ascending: false }).limit(20),
      ])
      return json({
        account: acc,
        permissions: (perms || []).map((p: any) => p.permission_key),
        transactions: txs || [],
      })
    }

    if (action === 'leaderboard') {
      const period = url.searchParams.get('period') || 'all'  // 'all' | 'week'
      if (period === 'week') {
        const since = new Date()
        const day = since.getUTCDay() || 7
        since.setUTCDate(since.getUTCDate() - day + 1)
        since.setUTCHours(0, 0, 0, 0)
        const { data: txs } = await supabase.from('point_transactions')
          .select('account_id, amount').gte('created_at', since.toISOString()).gte('amount', 0).limit(10000)
        const tally: Record<string, number> = {}
        for (const t of txs || []) tally[t.account_id] = (tally[t.account_id] || 0) + t.amount
        const ids = Object.keys(tally)
        const { data: accs } = ids.length
          ? await supabase.from('accounts').select('id, username').in('id', ids)
          : { data: [] as any }
        const top = (accs || []).map((a: any) => ({ id: a.id, username: a.username || '?', points: tally[a.id] || 0 }))
          .sort((a, b) => b.points - a.points).slice(0, 25)
        return json({ top, period: 'week' })
      }
      const { data } = await supabase.from('accounts')
        .select('id, username, total_earned, points').not('username', 'is', null)
        .order('total_earned', { ascending: false }).limit(25)
      return json({ top: (data || []).map((a: any) => ({ id: a.id, username: a.username, points: a.total_earned })), period: 'all' })
    }

    // ============================================================
    // QUESTS
    // ============================================================
    if (action === 'getQuests') {
      const s = await requireSession(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accountId = s.account_id || s.code_id
      const { data: quests } = await supabase.from('quests').select('*').eq('active', true).order('quest_type').order('reward')
      const dailyKey = periodKey('daily')
      const weeklyKey = periodKey('weekly')
      const ids = (quests || []).map((q: any) => q.id)
      const { data: progress } = ids.length
        ? await supabase.from('quest_progress').select('*').eq('account_id', accountId)
            .in('quest_id', ids).in('period_key', [dailyKey, weeklyKey])
        : { data: [] as any }
      const map: Record<string, any> = {}
      for (const p of progress || []) map[p.quest_id + ':' + p.period_key] = p
      const out = (quests || []).map((q: any) => {
        const pk = q.quest_type === 'daily' ? dailyKey : weeklyKey
        const p = map[q.id + ':' + pk]
        return {
          ...q, progress: p?.progress || 0, completed: !!p?.completed, claimed: !!p?.claimed, period_key: pk,
        }
      })
      return json({ quests: out })
    }

    // ============================================================
    // UPDATE NOTES
    // ============================================================
    if (action === 'getUpdateLogs') {
      const s = await getSession(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accountId = s.account_id || s.code_id
      const isAdmin = s.account.role === 'admin'
      const { data: logs } = await supabase.from('update_logs').select('*')
        .eq('published', true).in('target', isAdmin ? ['all', 'admins'] : ['all'])
        .order('published_at', { ascending: false }).limit(50)
      const { data: acks } = await supabase.from('update_log_acks').select('update_log_id').eq('account_id', accountId)
      const acked = new Set((acks || []).map((a: any) => a.update_log_id))
      return json({
        logs: (logs || []).map((l: any) => ({ ...l, acked: acked.has(l.id) })),
      })
    }

    if (action === 'ackUpdateLog') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accountId = s.account_id || s.code_id
      await supabase.from('update_log_acks').upsert({
        account_id: accountId, update_log_id: body.updateLogId,
      }, { onConflict: 'account_id,update_log_id' })
      return json({ success: true })
    }

    if (action === 'createUpdateLog') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data, error } = await supabase.from('update_logs').insert({
        version: String(body.version || '').slice(0, 30),
        title: String(body.title || 'Update').slice(0, 200),
        body_md: String(body.body || '').slice(0, 10000),
        highlights: Array.isArray(body.highlights) ? body.highlights.slice(0, 20).map((h: any) => String(h).slice(0, 200)) : [],
        severity: ['info','warn','critical'].includes(body.severity) ? body.severity : 'info',
        target: ['all','admins'].includes(body.target) ? body.target : 'all',
        require_ack: !!body.requireAck,
        published: body.published !== false,
        published_by: s.account_id || s.code_id,
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      await supabase.from('audit_logs').insert({
        actor_account_id: s.account_id || s.code_id, action: 'update_log.create', target: data.id,
      })
      return json({ success: true, log: data })
    }

    if (action === 'deleteUpdateLog') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('update_logs').delete().eq('id', body.updateLogId)
      return json({ success: true })
    }

    // ============================================================
    // ANNOUNCEMENTS
    // ============================================================
    if (action === 'getAnnouncements') {
      const s = await getSession(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accountId = s.account_id || s.code_id
      const isAdmin = s.account.role === 'admin'
      const { data: anns } = await supabase.from('announcements').select('*').eq('active', true)
        .in('target', isAdmin ? ['all', 'admins'] : ['all']).order('created_at', { ascending: false }).limit(20)
      const { data: acks } = await supabase.from('announcement_acks').select('announcement_id').eq('account_id', accountId)
      const acked = new Set((acks || []).map((a: any) => a.announcement_id))
      return json({ announcements: (anns || []).map((a: any) => ({ ...a, acked: acked.has(a.id) })) })
    }
    if (action === 'ackAnnouncement') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accountId = s.account_id || s.code_id
      await supabase.from('announcement_acks').upsert({ account_id: accountId, announcement_id: body.announcementId }, { onConflict: 'account_id,announcement_id' })
      return json({ success: true })
    }
    if (action === 'createAnnouncement') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data, error } = await supabase.from('announcements').insert({
        title: String(body.title || '').slice(0, 200),
        body: String(body.body || '').slice(0, 5000),
        severity: ['info','warn','critical'].includes(body.severity) ? body.severity : 'info',
        dismissable: body.dismissable !== false,
        active: body.active !== false,
        target: ['all','admins'].includes(body.target) ? body.target : 'all',
        created_by: s.account_id || s.code_id,
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, announcement: data })
    }
    if (action === 'deleteAnnouncement') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('announcements').delete().eq('id', body.id)
      return json({ success: true })
    }
    if (action === 'getAllAnnouncements') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
      return json({ announcements: data || [] })
    }

    // ============================================================
    // FEATURE FLAGS (admin)
    // ============================================================
    if (action === 'setFlag') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('feature_flags').update({
        enabled: !!body.enabled,
        scope: ['all','admins'].includes(body.scope) ? body.scope : 'all',
        scheduled_for: body.scheduledFor || null,
        updated_by: s.account_id || s.code_id,
        updated_at: new Date().toISOString(),
      }).eq('key', body.key)
      await supabase.from('audit_logs').insert({
        actor_account_id: s.account_id || s.code_id, action: 'flag.set', target: body.key, meta: { enabled: body.enabled, scope: body.scope },
      })
      return json({ success: true })
    }

    // ============================================================
    // ACCOUNTS (admin)
    // ============================================================
    if (action === 'getAccounts') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('accounts')
        .select('id, username, role, banned, muted_until, points, total_earned, chat_count, streak_days, last_login_at, created_at, must_set_username')
        .order('created_at', { ascending: false })
      const { data: perms } = await supabase.from('account_permissions').select('account_id, permission_key')
      const map: Record<string, string[]> = {}
      for (const p of perms || []) (map[p.account_id] ||= []).push(p.permission_key)
      return json({ accounts: (data || []).map((a: any) => ({ ...a, permissions: map[a.id] || [] })) })
    }
    if (action === 'adminUpdateAccount') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const updates: any = {}
      if (body.role !== undefined) updates.role = body.role === 'admin' ? 'admin' : 'user'
      if (body.banned !== undefined) updates.banned = !!body.banned
      if (body.muteMinutes !== undefined) {
        updates.muted_until = body.muteMinutes > 0 ? new Date(Date.now() + body.muteMinutes * 60_000).toISOString() : null
      }
      if (body.points !== undefined) updates.points = Math.max(0, Math.floor(Number(body.points) || 0))
      if (Object.keys(updates).length) await supabase.from('accounts').update(updates).eq('id', body.accountId)
      if (body.banned) await supabase.from('active_sessions').delete().eq('account_id', body.accountId)
      await supabase.from('audit_logs').insert({
        actor_account_id: s.account_id || s.code_id, action: 'account.update', target: body.accountId, meta: updates,
      })
      return json({ success: true })
    }
    if (action === 'adminGrantPerm') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('account_permissions').upsert({
        account_id: body.accountId, permission_key: body.permKey, granted_by: s.account_id || s.code_id,
      }, { onConflict: 'account_id,permission_key' })
      return json({ success: true })
    }
    if (action === 'adminRevokePerm') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('account_permissions').delete().eq('account_id', body.accountId).eq('permission_key', body.permKey)
      return json({ success: true })
    }
    if (action === 'adminAdjustPoints') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const delta = Math.floor(Number(body.amount) || 0)
      const { data: acc } = await supabase.from('accounts').select('points, total_earned').eq('id', body.accountId).maybeSingle()
      const newPoints = Math.max(0, (acc?.points || 0) + delta)
      await supabase.from('accounts').update({
        points: newPoints,
        total_earned: delta > 0 ? (acc?.total_earned || 0) + delta : (acc?.total_earned || 0),
      }).eq('id', body.accountId)
      await supabase.from('point_transactions').insert({
        account_id: body.accountId, amount: delta, reason: 'admin.adjust', meta: { by: s.account_id || s.code_id, note: body.note || null },
      })
      return json({ success: true, points: newPoints })
    }
    if (action === 'getPermissions') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('permissions').select('*').order('key')
      return json({ permissions: data || [] })
    }

    // ============================================================
    // MULTIPLIERS (admin)
    // ============================================================
    if (action === 'getMultipliers') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('point_multipliers').select('*').order('created_at', { ascending: false })
      return json({ multipliers: data || [] })
    }
    if (action === 'createMultiplier') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data, error } = await supabase.from('point_multipliers').insert({
        name: String(body.name || 'Bonus').slice(0, 100),
        multiplier: Math.max(1, Math.min(10, Number(body.multiplier) || 2)),
        starts_at: body.startsAt, ends_at: body.endsAt,
        active: true,
        created_by: s.account_id || s.code_id,
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, multiplier: data })
    }
    if (action === 'endMultiplier') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('point_multipliers').update({ active: false, ends_at: new Date().toISOString() }).eq('id', body.multiplierId)
      return json({ success: true })
    }
    if (action === 'getActiveMultiplier') {
      const mult = await currentMultiplier()
      return json({ multiplier: mult })
    }

    // ============================================================
    // QUESTS (admin)
    // ============================================================
    if (action === 'adminGetQuests') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('quests').select('*').order('quest_type').order('reward')
      return json({ quests: data || [] })
    }
    if (action === 'adminCreateQuest') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data, error } = await supabase.from('quests').insert({
        key: String(body.key || `quest_${Date.now()}`).slice(0, 60),
        title: String(body.title || '').slice(0, 100),
        description: String(body.description || '').slice(0, 300),
        quest_type: body.quest_type === 'weekly' ? 'weekly' : 'daily',
        goal: Math.max(1, Math.floor(Number(body.goal) || 1)),
        reward: Math.max(1, Math.floor(Number(body.reward) || 25)),
        metric: ['chat','play','login','poll_vote','win'].includes(body.metric) ? body.metric : 'chat',
        active: body.active !== false,
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, quest: data })
    }
    if (action === 'adminUpdateQuest') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const updates: any = {}
      for (const k of ['title','description','goal','reward','active']) if (body[k] !== undefined) updates[k] = body[k]
      await supabase.from('quests').update(updates).eq('id', body.questId)
      return json({ success: true })
    }
    if (action === 'adminDeleteQuest') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('quests').delete().eq('id', body.questId)
      return json({ success: true })
    }

    // ============================================================
    // CHAT (upgraded)
    // ============================================================
    if (action === 'getChat') {
      const { data } = await supabase.from('chat_messages')
        .select('id, account_id, code_id, username, message, is_admin, image_url, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
        .order('created_at', { ascending: false }).limit(150)
      return json({ messages: (data || []).reverse() })
    }
    if (action === 'sendChat') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      // Mute check
      if (s.account.muted_until && new Date(s.account.muted_until) > new Date()) {
        return json({ error: 'You are muted', mutedUntil: s.account.muted_until }, 429)
      }
      // Username required
      if (!s.account.username) return json({ error: 'Set a username before chatting' }, 400)
      const accountId = s.account_id || s.code_id
      // Rate limit: standard 2s, fast users 500ms
      const { data: perms } = await supabase.from('account_permissions').select('permission_key').eq('account_id', accountId)
      const fastChat = (perms || []).some((p: any) => p.permission_key === 'chat.fast')
      if (s.account.last_chat_at) {
        const elapsed = Date.now() - new Date(s.account.last_chat_at).getTime()
        const limit = fastChat ? 500 : 2000
        if (elapsed < limit) return json({ error: 'Slow down a bit', wait: limit - elapsed }, 429)
      }
      let msg = String(body.message || '').trim().slice(0, 500)
      if (!msg && !body.imageUrl) return json({ error: 'Empty message' }, 400)
      msg = filterProfanity(msg)
      const imageUrl = body.imageUrl ? String(body.imageUrl).slice(0, 1000) : null
      // Image gating
      if (imageUrl) {
        const { data: flag } = await supabase.from('feature_flags').select('enabled').eq('key', 'image_uploads_enabled').maybeSingle()
        const hasPerm = (perms || []).some((p: any) => p.permission_key === 'chat.image_upload')
        if (!flag?.enabled || !hasPerm) return json({ error: 'Image uploads not unlocked' }, 403)
      }

      await supabase.from('chat_messages').insert({
        account_id: accountId, code_id: accountId,
        username: s.account.username, message: msg,
        is_admin: s.account.role === 'admin', image_url: imageUrl,
      })
      // bookkeeping
      await supabase.from('accounts').update({
        last_chat_at: new Date().toISOString(),
        chat_count: (s.account as any).chat_count !== undefined ? (s.account as any).chat_count + 1 : 1,
      }).eq('id', accountId)
      // points: 1 per message, capped daily by quest goal anyway; diminishing handled via cooldown
      await awardPoints(accountId, 1, 'chat.message')
      await bumpQuest(accountId, 'chat', 1)
      return json({ success: true })
    }
    if (action === 'deleteChat') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('chat_messages').delete().eq('id', body.messageId)
      return json({ success: true })
    }
    if (action === 'reportChat') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('chat_reports').insert({
        message_id: body.messageId, reporter_account_id: s.account_id || s.code_id, reason: String(body.reason || '').slice(0, 300),
      })
      return json({ success: true })
    }
    if (action === 'getReports') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data: reports } = await supabase.from('chat_reports').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(100)
      const ids = [...new Set((reports || []).map((r: any) => r.message_id))]
      const { data: msgs } = ids.length
        ? await supabase.from('chat_messages').select('id, username, message, image_url, account_id').in('id', ids)
        : { data: [] as any }
      const m = new Map((msgs || []).map((x: any) => [x.id, x]))
      return json({ reports: (reports || []).map((r: any) => ({ ...r, message: m.get(r.message_id) || null })) })
    }
    if (action === 'resolveReport') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('chat_reports').update({ status: 'resolved' }).eq('id', body.reportId)
      return json({ success: true })
    }

    // ============================================================
    // KEEP-ALIVE & EXISTING ACTIONS (favorites, recent, requests, polls,
    // sessions, codes, bans, screens, analytics)
    // ============================================================
    if (action === 'toggleFav') {
      const body = await req.json()
      const accId = body.codeId
      if (!accId || !body.gameId) return json({ error: 'Missing fields' }, 400)
      const { data: existing } = await supabase.from('code_favorites').select('id').eq('account_id', accId).eq('game_id', body.gameId).maybeSingle()
      if (existing) {
        await supabase.from('code_favorites').delete().eq('id', existing.id)
        return json({ favorited: false })
      }
      await supabase.from('code_favorites').insert({ code_id: accId, account_id: accId, game_id: body.gameId })
      return json({ favorited: true })
    }
    if (action === 'getFavs') {
      const accId = url.searchParams.get('codeId')
      if (!accId) return json({ error: 'Missing codeId' }, 400)
      const { data } = await supabase.from('code_favorites').select('game_id').eq('account_id', accId)
      return json({ favorites: (data || []).map((f: any) => f.game_id) })
    }
    if (action === 'saveProgress') {
      const body = await req.json()
      const accId = body.codeId
      if (!accId || !body.progressType) return json({ error: 'Missing fields' }, 400)
      await supabase.from('code_progress').upsert(
        { code_id: accId, account_id: accId, progress_type: body.progressType, data: body.data, updated_at: new Date().toISOString() },
        { onConflict: 'code_id,progress_type' }
      )
      return json({ success: true })
    }
    if (action === 'addRecent') {
      const body = await req.json()
      const accId = body.codeId
      if (!accId || !body.game?.id) return json({ error: 'Missing fields' }, 400)
      const { data: row } = await supabase.from('code_progress').select('data').eq('account_id', accId).eq('progress_type', 'recent_games').maybeSingle()
      const list: any[] = Array.isArray((row as any)?.data?.list) ? (row as any).data.list : []
      const filtered = list.filter((g: any) => g.id !== body.game.id)
      const next = [{ ...body.game, ts: Date.now() }, ...filtered].slice(0, 24)
      await supabase.from('code_progress').upsert(
        { code_id: accId, account_id: accId, progress_type: 'recent_games', data: { list: next }, updated_at: new Date().toISOString() },
        { onConflict: 'code_id,progress_type' }
      )
      return json({ success: true, recent: next })
    }
    if (action === 'getRecent') {
      const accId = url.searchParams.get('codeId')
      if (!accId) return json({ error: 'Missing codeId' }, 400)
      const { data } = await supabase.from('code_progress').select('data').eq('account_id', accId).eq('progress_type', 'recent_games').maybeSingle()
      return json({ recent: (data as any)?.data?.list || [] })
    }

    // legacy admin code helpers — stay compatible
    if (action === 'getCodes') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data: codes } = await supabase.from('access_codes').select('id, code, is_admin, active, created_at').order('created_at')
      return json({ codes: codes || [] })
    }
    if (action === 'addCode') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const code = body.code.toLowerCase().trim()
      const { data, error } = await supabase.from('access_codes').insert({ code, is_admin: body.isAdmin || false }).select().single()
      if (error) return json({ error: error.message }, 400)
      // mirror to accounts
      const { data: hashed } = await supabase.rpc('hash_password', { _password: code })
      await supabase.from('accounts').upsert({
        id: data.id, password_hash: hashed, role: body.isAdmin ? 'admin' : 'user', must_set_username: true, username: null,
      }, { onConflict: 'id' })
      return json({ success: true, code: data })
    }
    if (action === 'removeCode') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('active_sessions').delete().eq('code_id', body.codeId)
      await supabase.from('access_codes').update({ active: false }).eq('id', body.codeId)
      await supabase.from('accounts').update({ banned: true }).eq('id', body.codeId)
      return json({ success: true })
    }
    if (action === 'activateCode') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('access_codes').update({ active: true }).eq('id', body.codeId)
      await supabase.from('accounts').update({ banned: false }).eq('id', body.codeId)
      return json({ success: true })
    }
    if (action === 'getSessions') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('active_sessions')
        .select('id, username, is_admin, created_at, last_active, code_id, account_id, device_hash, session_token, current_view, current_game, current_url')
        .order('created_at', { ascending: false })
      return json({ sessions: data || [] })
    }
    if (action === 'endSession') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('active_sessions').delete().eq('id', body.sessionId)
      return json({ success: true })
    }
    if (action === 'getLogs') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('login_logs').select('*').order('created_at', { ascending: false }).limit(500)
      return json({ logs: data || [] })
    }
    if (action === 'changeAdminCode') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const newCode = String(body.newCode).trim()
      await supabase.from('access_codes').update({ code: newCode }).eq('id', body.oldCodeId)
      const { data: hashed } = await supabase.rpc('hash_password', { _password: newCode })
      await supabase.from('accounts').update({ password_hash: hashed }).eq('id', body.oldCodeId)
      return json({ success: true })
    }

    if (action === 'banDevice') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      if (!body.deviceHash) return json({ error: 'Missing deviceHash' }, 400)
      await supabase.from('banned_devices').upsert({
        device_hash: body.deviceHash, reason: body.reason || null,
        last_username: body.username || null, last_user_agent: body.userAgent || null,
      }, { onConflict: 'device_hash' })
      await supabase.from('active_sessions').delete().eq('device_hash', body.deviceHash)
      return json({ success: true })
    }
    if (action === 'unbanDevice') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('banned_devices').delete().eq('device_hash', body.deviceHash)
      return json({ success: true })
    }
    if (action === 'getBannedDevices') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('banned_devices').select('*').order('created_at', { ascending: false })
      return json({ banned: data || [] })
    }
    if (action === 'getCodeAccount') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const codeId = url.searchParams.get('codeId')
      if (!codeId) return json({ error: 'Missing codeId' }, 400)
      const [favs, progress, sessions, logs] = await Promise.all([
        supabase.from('code_favorites').select('game_id, created_at').eq('account_id', codeId),
        supabase.from('code_progress').select('progress_type, data').eq('account_id', codeId),
        supabase.from('active_sessions').select('username, created_at, last_active, device_hash').eq('account_id', codeId),
        supabase.from('login_logs').select('username, created_at, success, device_hash').order('created_at', { ascending: false }).limit(50),
      ])
      const recent = (progress.data || []).find((p: any) => p.progress_type === 'recent_games')?.data?.list || []
      return json({ favorites: (favs.data || []).map((f: any) => f.game_id), recent, sessions: sessions.data || [], recentLogs: logs.data || [] })
    }

    // requests (kept compatible — uses account_id mirror)
    if (action === 'submitRequest') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const message = String(body.message || '').trim()
      if (!message || message.length > 2000) return json({ error: 'Message must be 1-2000 characters' }, 400)
      const cat = ['request','complaint','comment'].includes(body.category) ? body.category : 'request'
      const accId = s.account_id || s.code_id
      const { data, error } = await supabase.from('user_requests').insert({
        code_id: accId, account_id: accId, username: s.account.username || s.username, category: cat, message,
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, request: data })
    }
    if (action === 'getMyRequests') {
      const s = await requireSession(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const accId = s.account_id || s.code_id
      const { data } = await supabase.from('user_requests').select('*').eq('account_id', accId).order('created_at', { ascending: false }).limit(100)
      return json({ requests: data || [] })
    }
    if (action === 'markNotified') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').update({ notified: true }).eq('id', body.requestId).eq('account_id', s.account_id || s.code_id)
      return json({ success: true })
    }
    if (action === 'getAllRequests') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('user_requests').select('*').order('created_at', { ascending: false }).limit(500)
      return json({ requests: data || [] })
    }
    if (action === 'respondRequest') {
      const body = await req.json()
      if (!['accepted','denied','pending'].includes(body.status)) return json({ error: 'Invalid status' }, 400)
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').update({
        status: body.status, admin_response: body.response || null, responded_at: new Date().toISOString(), notified: false,
      }).eq('id', body.requestId)
      return json({ success: true })
    }
    if (action === 'deleteRequest') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').delete().eq('id', body.requestId)
      return json({ success: true })
    }

    // activity
    if (action === 'updateActivity') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('active_sessions').update({
        current_view: body.view || null, current_game: body.game || null, current_url: body.url || null,
        last_active: new Date().toISOString(),
      }).eq('session_token', body.token)
      return json({ success: true })
    }
    if (action === 'uploadScreen') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      if (!body.screenshot || typeof body.screenshot !== 'string') return json({ error: 'No screenshot' }, 400)
      if (body.screenshot.length > 600_000) return json({ error: 'Too large' }, 400)
      await supabase.from('session_screens').upsert({
        session_token: body.token, code_id: s.account_id || s.code_id, account_id: s.account_id || s.code_id,
        username: s.account.username || s.username, screenshot: body.screenshot,
        width: body.width || null, height: body.height || null, updated_at: new Date().toISOString(),
      }, { onConflict: 'session_token' })
      return json({ success: true })
    }
    if (action === 'getScreens') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('session_screens').select('session_token, code_id, account_id, username, width, height, updated_at').order('updated_at', { ascending: false })
      return json({ screens: data || [] })
    }
    if (action === 'getScreen') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const tok = url.searchParams.get('sessionToken')
      if (!tok) return json({ error: 'Missing sessionToken' }, 400)
      const { data } = await supabase.from('session_screens').select('*').eq('session_token', tok).maybeSingle()
      return json({ screen: data || null })
    }

    // analytics
    if (action === 'trackPlay') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      if (!body.gameId) return json({ error: 'Missing gameId' }, 400)
      const accId = s.account_id || s.code_id
      await supabase.from('game_plays').insert({
        code_id: accId, account_id: accId, username: s.account.username || s.username,
        game_id: String(body.gameId).slice(0, 200), game_name: body.gameName ? String(body.gameName).slice(0, 200) : null,
      })
      await awardPoints(accId, 5, 'play.game', { game_id: body.gameId })
      await bumpQuest(accId, 'play', 1)
      return json({ success: true })
    }
    if (action === 'gameAnalytics') {
      const s = await requireAdmin(getToken())
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const days = Math.min(parseInt(url.searchParams.get('days') || '7'), 90)
      const since = new Date(Date.now() - days * 86400_000).toISOString()
      const { data } = await supabase.from('game_plays').select('game_id, game_name, played_at, username').gte('played_at', since).limit(5000)
      const byGame: Record<string, { id: string; name: string; plays: number; users: Set<string> }> = {}
      for (const p of data || []) {
        const k = p.game_id
        if (!byGame[k]) byGame[k] = { id: k, name: p.game_name || k, plays: 0, users: new Set() }
        byGame[k].plays++; byGame[k].users.add(p.username)
      }
      const top = Object.values(byGame).map(g => ({ id: g.id, name: g.name, plays: g.plays, uniqueUsers: g.users.size }))
        .sort((a, b) => b.plays - a.plays)
      return json({ top, totalPlays: (data || []).length, days })
    }

    // polls
    if (action === 'getPolls') {
      const { data: polls } = await supabase.from('polls').select('*').order('created_at', { ascending: false }).limit(50)
      const { data: votes } = await supabase.from('poll_votes').select('poll_id, option_index, account_id, code_id')
      const token = url.searchParams.get('token')
      let myAccId: string | null = null
      if (token) {
        const { data: sess } = await supabase.from('active_sessions').select('account_id, code_id').eq('session_token', token).maybeSingle()
        myAccId = sess?.account_id || sess?.code_id || null
      }
      const tally: Record<string, number[]> = {}
      const myVote: Record<string, number> = {}
      for (const p of polls || []) {
        const opts = Array.isArray(p.options) ? p.options : []
        tally[p.id] = new Array(opts.length).fill(0)
      }
      for (const v of votes || []) {
        if (tally[v.poll_id] && v.option_index >= 0 && v.option_index < tally[v.poll_id].length) tally[v.poll_id][v.option_index]++
        if (myAccId && (v.account_id === myAccId || v.code_id === myAccId)) myVote[v.poll_id] = v.option_index
      }
      return json({ polls: polls || [], tally, myVote })
    }
    if (action === 'createPoll') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      if (!body.question || !Array.isArray(body.options) || body.options.length < 2) return json({ error: 'Need question and at least 2 options' }, 400)
      const opts = body.options.map((o: any) => String(o).slice(0, 200)).slice(0, 10)
      const { data, error } = await supabase.from('polls').insert({
        question: String(body.question).slice(0, 500), options: opts, ends_at: body.endsAt || null,
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, poll: data })
    }
    if (action === 'closePoll') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('polls').update({ active: false }).eq('id', body.pollId)
      return json({ success: true })
    }
    if (action === 'deletePoll') {
      const body = await req.json()
      const s = await requireAdmin(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('polls').delete().eq('id', body.pollId)
      return json({ success: true })
    }
    if (action === 'votePoll') {
      const body = await req.json()
      const s = await requireSession(getToken(body.token))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data: poll } = await supabase.from('polls').select('id, options, active').eq('id', body.pollId).maybeSingle()
      if (!poll || !poll.active) return json({ error: 'Poll closed' }, 400)
      const opts = Array.isArray(poll.options) ? poll.options : []
      const idx = parseInt(body.optionIndex)
      if (isNaN(idx) || idx < 0 || idx >= opts.length) return json({ error: 'Invalid option' }, 400)
      const accId = s.account_id || s.code_id
      await supabase.from('poll_votes').upsert(
        { poll_id: body.pollId, code_id: accId, account_id: accId, option_index: idx },
        { onConflict: 'poll_id,code_id' }
      )
      await bumpQuest(accId, 'poll_vote', 1)
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
