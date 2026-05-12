import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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

    // === LOGIN: validate code, create session ===
    if (action === 'login') {
      const body = await req.json()
      const { username, code, deviceHash } = body
      if (!username || !code) return json({ error: 'Missing fields' }, 400)
      const userAgent = (req.headers.get('user-agent') || '').substring(0, 200)
      const ip = req.headers.get('x-forwarded-for') || 'unknown'

      // Check device ban first
      if (deviceHash) {
        const { data: banned } = await supabase
          .from('banned_devices')
          .select('id, reason')
          .eq('device_hash', deviceHash)
          .maybeSingle()
        if (banned) {
          await supabase.from('login_logs').insert({
            username, code_text: code, success: false, ip, user_agent: userAgent, device_hash: deviceHash,
          })
          return json({ success: false, message: `Device banned${banned.reason ? `: ${banned.reason}` : '.'}` })
        }
      }

      // Check code
      const { data: codeRow } = await supabase
        .from('access_codes')
        .select('id, code, is_admin, active')
        .ilike('code', code)
        .single()

      // Log attempt — store FULL code text (admin-only viewable via toggle)
      await supabase.from('login_logs').insert({
        username,
        code_text: code,
        success: !!codeRow?.active,
        ip,
        user_agent: userAgent,
        device_hash: deviceHash || null,
      })

      if (!codeRow || !codeRow.active) {
        return json({ success: false, message: 'Invalid access code. Try again.' })
      }

      // Create session
      const sessionToken = crypto.randomUUID()
      await supabase.from('active_sessions').insert({
        code_id: codeRow.id,
        username,
        session_token: sessionToken,
        is_admin: codeRow.is_admin,
        device_hash: deviceHash || null,
      })

      const { data: favs } = await supabase
        .from('code_favorites').select('game_id').eq('code_id', codeRow.id)
      const { data: progress } = await supabase
        .from('code_progress').select('progress_type, data').eq('code_id', codeRow.id)

      return json({
        success: true,
        isAdmin: codeRow.is_admin,
        message: codeRow.is_admin ? 'Admin access granted.' : 'Access granted!',
        sessionToken,
        codeId: codeRow.id,
        favorites: (favs || []).map((f: any) => f.game_id),
        progress: (progress || []).reduce((acc: any, p: any) => ({ ...acc, [p.progress_type]: p.data }), {}),
      })
    }

    // === VALIDATE SESSION ===
    if (action === 'validate') {
      const token = url.searchParams.get('token')
      if (!token) return json({ valid: false })

      const { data: session } = await supabase
        .from('active_sessions')
        .select('id, code_id, username, is_admin, device_hash, access_codes!inner(active)')
        .eq('session_token', token)
        .single()

      if (!session || !(session as any).access_codes?.active) {
        if (session) await supabase.from('active_sessions').delete().eq('id', session.id)
        return json({ valid: false })
      }

      // Re-check device ban on every validate
      if ((session as any).device_hash) {
        const { data: banned } = await supabase
          .from('banned_devices').select('id').eq('device_hash', (session as any).device_hash).maybeSingle()
        if (banned) {
          await supabase.from('active_sessions').delete().eq('id', session.id)
          return json({ valid: false, banned: true })
        }
      }

      await supabase.from('active_sessions').update({ last_active: new Date().toISOString() }).eq('id', session.id)
      return json({ valid: true, username: session.username, isAdmin: session.is_admin, codeId: session.code_id })
    }

    // === LOGOUT (also handles sendBeacon: text/plain JSON body) ===
    if (action === 'logout') {
      let token = url.searchParams.get('token')
      if (!token) {
        try { const b = await req.json(); token = b?.token } catch {}
      }
      if (token) await supabase.from('active_sessions').delete().eq('session_token', token)
      return json({ success: true })
    }

    // === TOGGLE FAVORITE ===
    if (action === 'toggleFav') {
      const body = await req.json()
      const { codeId, gameId } = body
      if (!codeId || !gameId) return json({ error: 'Missing fields' }, 400)
      const { data: existing } = await supabase
        .from('code_favorites').select('id').eq('code_id', codeId).eq('game_id', gameId).single()
      if (existing) {
        await supabase.from('code_favorites').delete().eq('id', existing.id)
        return json({ favorited: false })
      } else {
        await supabase.from('code_favorites').insert({ code_id: codeId, game_id: gameId })
        return json({ favorited: true })
      }
    }

    if (action === 'getFavs') {
      const codeId = url.searchParams.get('codeId')
      if (!codeId) return json({ error: 'Missing codeId' }, 400)
      const { data } = await supabase.from('code_favorites').select('game_id').eq('code_id', codeId)
      return json({ favorites: (data || []).map((f: any) => f.game_id) })
    }

    if (action === 'saveProgress') {
      const body = await req.json()
      const { codeId, progressType, data } = body
      if (!codeId || !progressType) return json({ error: 'Missing fields' }, 400)
      await supabase.from('code_progress').upsert(
        { code_id: codeId, progress_type: progressType, data, updated_at: new Date().toISOString() },
        { onConflict: 'code_id,progress_type' }
      )
      return json({ success: true })
    }

    // === RECENTLY PLAYED ===
    if (action === 'addRecent') {
      const body = await req.json()
      const { codeId, game } = body // game = { id, name, icon, url }
      if (!codeId || !game?.id) return json({ error: 'Missing fields' }, 400)
      const { data: row } = await supabase
        .from('code_progress').select('data').eq('code_id', codeId).eq('progress_type', 'recent_games').maybeSingle()
      const list: any[] = Array.isArray((row as any)?.data?.list) ? (row as any).data.list : []
      const filtered = list.filter((g: any) => g.id !== game.id)
      const next = [{ ...game, ts: Date.now() }, ...filtered].slice(0, 24)
      await supabase.from('code_progress').upsert(
        { code_id: codeId, progress_type: 'recent_games', data: { list: next }, updated_at: new Date().toISOString() },
        { onConflict: 'code_id,progress_type' }
      )
      return json({ success: true, recent: next })
    }

    if (action === 'getRecent') {
      const codeId = url.searchParams.get('codeId')
      if (!codeId) return json({ error: 'Missing codeId' }, 400)
      const { data } = await supabase.from('code_progress')
        .select('data').eq('code_id', codeId).eq('progress_type', 'recent_games').maybeSingle()
      return json({ recent: (data as any)?.data?.list || [] })
    }

    // === ADMIN HELPERS ===
    const requireAdmin = async (token: string | null) => {
      if (!token) return null
      const { data: s } = await supabase.from('active_sessions').select('is_admin').eq('session_token', token).single()
      return s?.is_admin ? s : null
    }

    if (action === 'getCodes') {
      const s = await requireAdmin(url.searchParams.get('token'))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data: codes } = await supabase.from('access_codes')
        .select('id, code, is_admin, active, created_at').order('created_at')
      return json({ codes: codes || [] })
    }

    if (action === 'addCode') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data, error } = await supabase.from('access_codes')
        .insert({ code: body.code.toLowerCase().trim(), is_admin: body.isAdmin || false }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, code: data })
    }

    if (action === 'removeCode') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('active_sessions').delete().eq('code_id', body.codeId)
      await supabase.from('access_codes').update({ active: false }).eq('id', body.codeId)
      return json({ success: true })
    }

    if (action === 'activateCode') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('access_codes').update({ active: true }).eq('id', body.codeId)
      return json({ success: true })
    }

    if (action === 'getSessions') {
      const s = await requireAdmin(url.searchParams.get('token'))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data: sessions } = await supabase.from('active_sessions')
        .select('id, username, is_admin, created_at, last_active, code_id, device_hash')
        .order('created_at', { ascending: false })
      return json({ sessions: sessions || [] })
    }

    if (action === 'endSession') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('active_sessions').delete().eq('id', body.sessionId)
      return json({ success: true })
    }

    if (action === 'getLogs') {
      const s = await requireAdmin(url.searchParams.get('token'))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data: logs } = await supabase.from('login_logs')
        .select('*').order('created_at', { ascending: false }).limit(500)
      return json({ logs: logs || [] })
    }

    if (action === 'changeAdminCode') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('access_codes').update({ code: body.newCode.trim() }).eq('id', body.oldCodeId)
      return json({ success: true })
    }

    // === DEVICE BANS ===
    if (action === 'banDevice') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { deviceHash, reason, username, userAgent } = body
      if (!deviceHash) return json({ error: 'Missing deviceHash' }, 400)
      await supabase.from('banned_devices').upsert(
        { device_hash: deviceHash, reason: reason || null, last_username: username || null, last_user_agent: userAgent || null },
        { onConflict: 'device_hash' }
      )
      // Kick any active sessions on that device
      await supabase.from('active_sessions').delete().eq('device_hash', deviceHash)
      return json({ success: true })
    }

    if (action === 'unbanDevice') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('banned_devices').delete().eq('device_hash', body.deviceHash)
      return json({ success: true })
    }

    if (action === 'getBannedDevices') {
      const s = await requireAdmin(url.searchParams.get('token'))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('banned_devices')
        .select('*').order('created_at', { ascending: false })
      return json({ banned: data || [] })
    }

    // === ADMIN: VIEW CODE "ACCOUNT" ===
    if (action === 'getCodeAccount') {
      const s = await requireAdmin(url.searchParams.get('token'))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const codeId = url.searchParams.get('codeId')
      if (!codeId) return json({ error: 'Missing codeId' }, 400)
      const [favs, progress, sessions, logs] = await Promise.all([
        supabase.from('code_favorites').select('game_id, created_at').eq('code_id', codeId),
        supabase.from('code_progress').select('progress_type, data').eq('code_id', codeId),
        supabase.from('active_sessions').select('username, created_at, last_active, device_hash').eq('code_id', codeId),
        supabase.from('login_logs').select('username, created_at, success, device_hash').order('created_at', { ascending: false }).limit(50),
      ])
      const recent = (progress.data || []).find((p: any) => p.progress_type === 'recent_games')?.data?.list || []
      return json({
        favorites: (favs.data || []).map((f: any) => f.game_id),
        recent,
        sessions: sessions.data || [],
        recentLogs: logs.data || [],
      })
    }

    // === USER: SUBMIT REQUEST/FEEDBACK ===
    if (action === 'submitRequest') {
      const body = await req.json()
      const { token, category, message } = body
      if (!token || !message) return json({ error: 'Missing fields' }, 400)
      if (typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
        return json({ error: 'Message must be 1-2000 characters' }, 400)
      }
      const cat = ['request', 'complaint', 'comment'].includes(category) ? category : 'request'
      const { data: session } = await supabase
        .from('active_sessions').select('code_id, username').eq('session_token', token).single()
      if (!session) return json({ error: 'Unauthorized' }, 403)
      const { data, error } = await supabase.from('user_requests').insert({
        code_id: session.code_id, username: session.username, category: cat, message: message.trim(),
      }).select().single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, request: data })
    }

    if (action === 'getMyRequests') {
      const token = url.searchParams.get('token')
      if (!token) return json({ error: 'Missing token' }, 400)
      const { data: session } = await supabase.from('active_sessions').select('code_id').eq('session_token', token).single()
      if (!session) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('user_requests').select('*')
        .eq('code_id', session.code_id).order('created_at', { ascending: false }).limit(100)
      return json({ requests: data || [] })
    }

    if (action === 'markNotified') {
      const body = await req.json()
      const { data: session } = await supabase.from('active_sessions').select('code_id').eq('session_token', body.token || '').single()
      if (!session) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').update({ notified: true }).eq('id', body.requestId).eq('code_id', session.code_id)
      return json({ success: true })
    }

    if (action === 'getAllRequests') {
      const s = await requireAdmin(url.searchParams.get('token'))
      if (!s) return json({ error: 'Unauthorized' }, 403)
      const { data } = await supabase.from('user_requests').select('*').order('created_at', { ascending: false }).limit(500)
      return json({ requests: data || [] })
    }

    if (action === 'respondRequest') {
      const body = await req.json()
      if (!['accepted', 'denied', 'pending'].includes(body.status)) return json({ error: 'Invalid status' }, 400)
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').update({
        status: body.status, admin_response: body.response || null, responded_at: new Date().toISOString(), notified: false,
      }).eq('id', body.requestId)
      return json({ success: true })
    }

    if (action === 'deleteRequest') {
      const body = await req.json()
      const s = await requireAdmin(body.token)
      if (!s) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').delete().eq('id', body.requestId)
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
