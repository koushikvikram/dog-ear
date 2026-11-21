// Approves an invite request: checks the caller is an admin, emails an invite with the
// service role key (which only exists inside this function), and marks the request approved.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*', // the caller must still present an admin's JWT
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const siteUrl = Deno.env.get('SITE_URL') // set with: supabase secrets set SITE_URL=https://<user>.github.io/<repo>/

  // 1. Who is calling?
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json({ error: 'Not signed in' }, 401)

  // 2. Are they an admin?
  const admin = createClient(url, service)
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle()
  if (!profile?.is_admin) return json({ error: 'Admins only' }, 403)

  // 3. Validate input
  const { email } = await req.json().catch(() => ({}))
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 254) {
    return json({ error: 'A valid email is required' }, 400)
  }

  // 4. Send the invite
  const { error } = await admin.auth.admin.inviteUserByEmail(email, siteUrl ? { redirectTo: siteUrl } : undefined)
  const alreadyRegistered = !!error && /already|registered|exists/i.test(error.message)
  if (error && !alreadyRegistered) return json({ error: error.message }, 400)

  // 5. Mark the request approved
  await admin.from('invite_requests').update({ status: 'approved' }).ilike('email', email)
  return json({ ok: true, alreadyRegistered })
})
