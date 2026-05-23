// Edge Function: delete-account
// Deletes the authenticated user's account using the service-role admin API.
// All user data cascades via FK ON DELETE CASCADE in the DB schema.
//
// Deploy: npx supabase functions deploy delete-account

import { errorResponse, jsonResponse } from '../_shared/plaid.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify the calling user's JWT
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    // Use the admin client with service role to delete from auth.users
    // This cascades to profiles and all related tables via ON DELETE CASCADE
    const admin = getAdminClient();

    // Clear push token before deletion (best-effort)
    await admin.from('profiles').update({ expo_push_token: null }).eq('id', userId);

    // Delete the user from Supabase Auth
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('[delete-account] Failed to delete user:', error);
      return errorResponse('Failed to delete account. Please try again.', 500);
    }

    console.log(`[delete-account] Deleted user ${userId}`);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('[delete-account] Unexpected error:', err);
    return errorResponse('An unexpected error occurred.', 500);
  }
});
