/**
 * STACKWEB Online Voting System
 * Edge Function: validate-token
 * Validates a voter token and returns its status + linked election.
 * Deploy to Supabase: supabase functions deploy validate-token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'missing_token', error: 'Token is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cleaned = token.trim().toUpperCase();

    // Validate token format: SW-XXXX-XXXX-XXXX
    if (!/^[A-Z0-9]{1,5}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(cleaned)) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'invalid_format', error: 'Token format is invalid. Expected SW-XXXX-XXXX-XXXX.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')    ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: voter, error } = await supabase
      .from('voters')
      .select('id, status, expires_at, election_id, elections(id, name, status)')
      .eq('token', cleaned)
      .single();

    if (error || !voter) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'not_found', error: 'Token not found.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check explicit DB status
    if (voter.status === 'used')    return new Response(JSON.stringify({ valid: false, reason: 'used',    voter }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (voter.status === 'revoked') return new Response(JSON.stringify({ valid: false, reason: 'revoked', voter }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (voter.status === 'expired') return new Response(JSON.stringify({ valid: false, reason: 'expired', voter }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Check timestamp expiry
    if (voter.expires_at && new Date(voter.expires_at) < new Date()) {
      await supabase.from('voters').update({ status: 'expired' }).eq('id', voter.id);
      return new Response(
        JSON.stringify({ valid: false, reason: 'expired', voter: { ...voter, status: 'expired' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check election status
    const election = voter.elections;
    if (!election || election.status !== 'active') {
      const reason = election ? `election_${election.status}` : 'no_election';
      return new Response(
        JSON.stringify({ valid: false, reason, voter, election }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ valid: true, reason: 'ok', voter, election }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'server_error', error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
