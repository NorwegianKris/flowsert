CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_email text;
  v_invite record;
  v_personnel_id uuid;
begin
  if auth.uid() is null then
    raise exception 'INVITE: Not authenticated';
  end if;

  v_user_email := lower(auth.jwt() ->> 'email');
  if v_user_email is null or v_user_email = '' then
    raise exception 'INVITE: No email in session';
  end if;

  -- 1) Lock the row to prevent double-accept races
  select * into v_invite
  from public.invitations
  where token = p_token
    and status = 'pending'
    and expires_at > now()
  limit 1
  for update;

  if not found then
    raise exception 'INVITE: Invalid/expired/used token';
  end if;

  if lower(v_invite.email) <> v_user_email then
    raise exception 'INVITE: Email mismatch. Invite is for %, you are logged in as %',
      v_invite.email, v_user_email;
  end if;

  -- Look up personnel record (NOT auth.uid())
  select id into v_personnel_id
  from public.personnel
  where business_id = v_invite.business_id
    and lower(email) = lower(v_invite.email)
  limit 1;

  if v_personnel_id is null then
    raise exception 'INVITE: No personnel record found for invited email';
  end if;

  -- Attach user to business
  update public.profiles
     set business_id = v_invite.business_id
   where id = auth.uid();

  if not found then
    raise exception 'INVITE: Profile missing for user %', auth.uid();
  end if;

  -- 2) Idempotent + state-safe update
  update public.invitations
     set status = 'accepted',
         personnel_id = v_personnel_id
   where id = v_invite.id
     and status = 'pending'
     and expires_at > now();

  if not found then
    raise exception 'INVITE: Invite already used or expired';
  end if;
end;
$function$;