-- One-time, email-verified owner activation without ever accepting passwords or
-- trusting user-provided signup metadata. Reserved email is stored PRIVATELY
-- in Supabase and is intentionally not checked into GitHub.
CREATE SCHEMA IF NOT EXISTS bac_private;
CREATE TABLE IF NOT EXISTS bac_private.owner_activation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  approved_email text NOT NULL CHECK (length(approved_email) BETWEEN 5 AND 254),
  configured_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON bac_private.owner_activation FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION bac_private.claim_owner_access()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  verified_email text;
  expected_email text;
  caller uuid := (SELECT auth.uid());
BEGIN
  IF caller IS NULL THEN RETURN false; END IF;
  SELECT lower(trim(email)) INTO verified_email
  FROM auth.users
  WHERE id=caller AND email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL THEN RETURN false; END IF;
  SELECT lower(trim(approved_email)) INTO expected_email
  FROM bac_private.owner_activation
  WHERE singleton=true;
  IF expected_email IS NULL OR verified_email<>expected_email THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE role='admin' AND user_id<>caller
  ) THEN RETURN false; END IF;
  INSERT INTO public.platform_roles(user_id,role)
  VALUES(caller,'admin')
  ON CONFLICT(user_id) DO NOTHING;
  RETURN EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id=caller AND role='admin'
  );
END;
$$;
REVOKE ALL ON FUNCTION bac_private.claim_owner_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bac_private.claim_owner_access() TO authenticated;
GRANT USAGE ON SCHEMA bac_private TO authenticated;

-- Public RPC is SECURITY INVOKER only, not privileged; private function verifies
-- the caller against auth.users and the hidden email reservation.
CREATE OR REPLACE FUNCTION public.claim_owner_access()
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.claim_owner_access(); $$;
REVOKE ALL ON FUNCTION public.claim_owner_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_access() TO authenticated;
