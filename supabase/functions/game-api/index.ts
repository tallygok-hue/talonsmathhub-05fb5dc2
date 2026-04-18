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
      const { username, code } = body
      if (!username || !code) return json({ error: 'Missing fields' }, 400)

      // Check code
      const { data: codeRow } = await supabase
        .from('access_codes')
        .select('id, code, is_admin, active')
        .ilike('code', code)
        .single()

      // Log attempt
      await supabase.from('login_logs').insert({
        username,
        code_text: codeRow?.is_admin ? '***ADMIN***' : code.slice(0, 3) + '***',
        success: !!codeRow?.active,
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: (req.headers.get('user-agent') || '').substring(0, 200),
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
      })

      // Load favorites for this code
      const { data: favs } = await supabase
        .from('code_favorites')
        .select('game_id')
        .eq('code_id', codeRow.id)

      // Load progress
      const { data: progress } = await supabase
        .from('code_progress')
        .select('progress_type, data')
        .eq('code_id', codeRow.id)

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
        .select('id, code_id, username, is_admin, access_codes!inner(active)')
        .eq('session_token', token)
        .single()

      if (!session || !(session as any).access_codes?.active) {
        // Clean up invalid session
        if (session) await supabase.from('active_sessions').delete().eq('id', session.id)
        return json({ valid: false })
      }

      // Update last_active
      await supabase.from('active_sessions').update({ last_active: new Date().toISOString() }).eq('id', session.id)

      return json({ valid: true, username: session.username, isAdmin: session.is_admin, codeId: session.code_id })
    }

    // === LOGOUT ===
    if (action === 'logout') {
      const token = url.searchParams.get('token')
      if (token) {
        await supabase.from('active_sessions').delete().eq('session_token', token)
      }
      return json({ success: true })
    }

    // === TOGGLE FAVORITE ===
    if (action === 'toggleFav') {
      const body = await req.json()
      const { codeId, gameId } = body
      if (!codeId || !gameId) return json({ error: 'Missing fields' }, 400)

      // Check if exists
      const { data: existing } = await supabase
        .from('code_favorites')
        .select('id')
        .eq('code_id', codeId)
        .eq('game_id', gameId)
        .single()

      if (existing) {
        await supabase.from('code_favorites').delete().eq('id', existing.id)
        return json({ favorited: false })
      } else {
        await supabase.from('code_favorites').insert({ code_id: codeId, game_id: gameId })
        return json({ favorited: true })
      }
    }

    // === GET FAVORITES ===
    if (action === 'getFavs') {
      const codeId = url.searchParams.get('codeId')
      if (!codeId) return json({ error: 'Missing codeId' }, 400)
      const { data } = await supabase.from('code_favorites').select('game_id').eq('code_id', codeId)
      return json({ favorites: (data || []).map((f: any) => f.game_id) })
    }

    // === SAVE PROGRESS ===
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

    // === ADMIN: GET ALL CODES ===
    if (action === 'getCodes') {
      const token = url.searchParams.get('token')
      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      const { data: codes } = await supabase
        .from('access_codes')
        .select('id, code, is_admin, active, created_at')
        .order('created_at')

      return json({ codes: codes || [] })
    }

    // === ADMIN: ADD CODE ===
    if (action === 'addCode') {
      const body = await req.json()
      const { token, code, isAdmin } = body

      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      const { data, error } = await supabase
        .from('access_codes')
        .insert({ code: code.toLowerCase().trim(), is_admin: isAdmin || false })
        .select()
        .single()

      if (error) return json({ error: error.message }, 400)
      return json({ success: true, code: data })
    }

    // === ADMIN: REMOVE CODE (deactivate + kick sessions) ===
    if (action === 'removeCode') {
      const body = await req.json()
      const { token, codeId } = body

      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      // Delete all sessions using this code (kicks everyone out)
      await supabase.from('active_sessions').delete().eq('code_id', codeId)
      // Deactivate the code
      await supabase.from('access_codes').update({ active: false }).eq('id', codeId)

      return json({ success: true })
    }

    // === ADMIN: REACTIVATE CODE ===
    if (action === 'activateCode') {
      const body = await req.json()
      const { token, codeId } = body

      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      await supabase.from('access_codes').update({ active: true }).eq('id', codeId)
      return json({ success: true })
    }

    // === ADMIN: GET SESSIONS ===
    if (action === 'getSessions') {
      const token = url.searchParams.get('token')
      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      const { data: sessions } = await supabase
        .from('active_sessions')
        .select('id, username, is_admin, created_at, last_active, code_id')
        .order('created_at', { ascending: false })

      return json({ sessions: sessions || [] })
    }

    // === ADMIN: END SESSION ===
    if (action === 'endSession') {
      const body = await req.json()
      const { token, sessionId } = body

      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      await supabase.from('active_sessions').delete().eq('id', sessionId)
      return json({ success: true })
    }

    // === ADMIN: GET LOGS ===
    if (action === 'getLogs') {
      const token = url.searchParams.get('token')
      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      const { data: logs } = await supabase
        .from('login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      return json({ logs: logs || [] })
    }

    // === ADMIN: CHANGE ADMIN CODE ===
    if (action === 'changeAdminCode') {
      const body = await req.json()
      const { token, oldCodeId, newCode } = body

      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()

      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      await supabase.from('access_codes').update({ code: newCode.trim() }).eq('id', oldCodeId)
      return json({ success: true })
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
        .from('active_sessions')
        .select('code_id, username')
        .eq('session_token', token)
        .single()
      if (!session) return json({ error: 'Unauthorized' }, 403)

      const { data, error } = await supabase
        .from('user_requests')
        .insert({
          code_id: session.code_id,
          username: session.username,
          category: cat,
          message: message.trim(),
        })
        .select()
        .single()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, request: data })
    }

    // === USER: LIST MY REQUESTS ===
    if (action === 'getMyRequests') {
      const token = url.searchParams.get('token')
      if (!token) return json({ error: 'Missing token' }, 400)
      const { data: session } = await supabase
        .from('active_sessions')
        .select('code_id')
        .eq('session_token', token)
        .single()
      if (!session) return json({ error: 'Unauthorized' }, 403)

      const { data } = await supabase
        .from('user_requests')
        .select('*')
        .eq('code_id', session.code_id)
        .order('created_at', { ascending: false })
        .limit(100)
      return json({ requests: data || [] })
    }

    // === USER: MARK NOTIFIED (so toast doesn't repeat) ===
    if (action === 'markNotified') {
      const body = await req.json()
      const { token, requestId } = body
      const { data: session } = await supabase
        .from('active_sessions')
        .select('code_id')
        .eq('session_token', token || '')
        .single()
      if (!session) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').update({ notified: true }).eq('id', requestId).eq('code_id', session.code_id)
      return json({ success: true })
    }

    // === ADMIN: GET ALL REQUESTS ===
    if (action === 'getAllRequests') {
      const token = url.searchParams.get('token')
      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()
      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      const { data } = await supabase
        .from('user_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      return json({ requests: data || [] })
    }

    // === ADMIN: RESPOND TO REQUEST ===
    if (action === 'respondRequest') {
      const body = await req.json()
      const { token, requestId, status, response } = body
      if (!['accepted', 'denied', 'pending'].includes(status)) {
        return json({ error: 'Invalid status' }, 400)
      }
      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()
      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)

      await supabase
        .from('user_requests')
        .update({
          status,
          admin_response: response || null,
          responded_at: new Date().toISOString(),
          notified: false,
        })
        .eq('id', requestId)
      return json({ success: true })
    }

    // === ADMIN: DELETE REQUEST ===
    if (action === 'deleteRequest') {
      const body = await req.json()
      const { token, requestId } = body
      const { data: session } = await supabase
        .from('active_sessions')
        .select('is_admin')
        .eq('session_token', token || '')
        .single()
      if (!session?.is_admin) return json({ error: 'Unauthorized' }, 403)
      await supabase.from('user_requests').delete().eq('id', requestId)
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
