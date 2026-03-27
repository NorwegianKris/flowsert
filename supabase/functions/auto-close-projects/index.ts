import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, { extraAllowHeaders: 'x-internal-secret' });
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Secret check for cron invocation security
  const secret = Deno.env.get('INTERNAL_CRON_SECRET');
  const provided = req.headers.get('x-internal-secret');
  if (!secret || provided !== secret) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date().toISOString();
  const results = { closed: 0, reopened: 0, warnings: 0 };

  try {
    // 1. Auto-close: projects where next_close_date <= now AND status = 'active'
    const { data: toClose, error: closeErr } = await supabase
      .from('projects')
      .select('*')
      .eq('auto_close_enabled', true)
      .eq('status', 'active')
      .lte('next_close_date', now);

    if (closeErr) throw closeErr;

    for (const project of (toClose || [])) {
      const newRotationsCompleted = (project.rotations_completed || 0) + 1;
      const totalRotations = project.rotation_count || 1;
      const allDone = newRotationsCompleted >= totalRotations;

      // Build compliance snapshot from assigned personnel
      let snapshot: any[] = [];
      if (project.assigned_personnel && project.assigned_personnel.length > 0) {
        const { data: personnelData } = await supabase
          .from('personnel')
          .select('id, name, role')
          .in('id', project.assigned_personnel);

        const { data: certs } = await supabase
          .from('certificates')
          .select('id, name, expiry_date, personnel_id')
          .in('personnel_id', project.assigned_personnel);

        snapshot = (personnelData || []).map(p => {
          const personCerts = (certs || []).filter(c => c.personnel_id === p.id);
          return {
            personnelId: p.id,
            name: p.name,
            role: p.role,
            certificates: personCerts.map(c => ({
              name: c.name,
              expiryDate: c.expiry_date,
              status: !c.expiry_date ? 'valid'
                : new Date(c.expiry_date) < new Date(project.start_date) ? 'expired'
                : new Date(c.expiry_date) <= new Date(project.end_date || now) ? 'warning'
                : 'valid',
            })),
          };
        });
      }

      // Insert project event
      await supabase.from('project_events').insert({
        project_id: project.id,
        event_type: 'auto_closed',
        metadata: {
          rotation_number: newRotationsCompleted,
          total_rotations: totalRotations,
          compliance_snapshot: snapshot,
        },
      });

      if (allDone) {
        // All rotations complete
        await supabase.from('projects').update({
          status: 'completed',
          rotations_completed: newRotationsCompleted,
          auto_close_enabled: false,
        }).eq('id', project.id);
      } else {
        // Calculate next dates
        const onDays = project.rotation_on_days || 14;
        const offDays = project.rotation_off_days || 14;
        const currentClose = new Date(project.next_close_date);
        const nextOpen = new Date(currentClose.getTime() + offDays * 86400000);
        const nextClose = new Date(nextOpen.getTime() + onDays * 86400000);

        await supabase.from('projects').update({
          status: 'pending',
          rotations_completed: newRotationsCompleted,
          next_open_date: nextOpen.toISOString(),
          next_close_date: nextClose.toISOString(),
        }).eq('id', project.id);
      }

      results.closed++;
    }

    // 2. Auto-reopen: projects where next_open_date <= now AND status = 'pending'
    const { data: toReopen, error: reopenErr } = await supabase
      .from('projects')
      .select('*')
      .eq('auto_close_enabled', true)
      .eq('status', 'pending')
      .lte('next_open_date', now);

    if (reopenErr) throw reopenErr;

    for (const project of (toReopen || [])) {
      await supabase.from('projects').update({
        status: 'active',
      }).eq('id', project.id);

      await supabase.from('project_events').insert({
        project_id: project.id,
        event_type: 'auto_reopened',
        metadata: {
          rotation_number: (project.rotations_completed || 0) + 1,
        },
      });

      results.reopened++;
    }

    // 3. Unassigned shift warning: shifts starting within 7 days with no personnel
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString();
    const { data: unstaffedShifts } = await supabase
      .from('projects')
      .select('id, name, shift_number, shift_group_id, start_date, business_id, project_manager')
      .not('shift_group_id', 'is', null)
      .lte('start_date', sevenDaysFromNow.split('T')[0])
      .gte('start_date', now.split('T')[0])
      .eq('status', 'active')
      .or('assigned_personnel.is.null,assigned_personnel.eq.{}');

    for (const shift of (unstaffedShifts || [])) {
      const daysUntilStart = Math.ceil(
        (new Date(shift.start_date).getTime() - Date.now()) / 86400000
      );

      // Count total shifts in group
      const { count: totalShifts } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('shift_group_id', shift.shift_group_id);

      // Create notification for the business
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          business_id: shift.business_id,
          subject: `Unstaffed shift warning: ${shift.name}`,
          message: `Shift ${shift.shift_number} of ${totalShifts || '?'} starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''} and has no personnel assigned.`,
        })
        .select('id')
        .single();

      if (notification) {
        // Notify admins - find admin personnel
        const { data: admins } = await supabase
          .from('personnel')
          .select('id')
          .eq('business_id', shift.business_id)
          .not('user_id', 'is', null)
          .limit(10);

        if (admins && admins.length > 0) {
          await supabase.from('notification_recipients').insert(
            admins.map(a => ({ notification_id: notification.id, personnel_id: a.id }))
          );
        }
      }

      results.warnings++;
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Auto-close error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
