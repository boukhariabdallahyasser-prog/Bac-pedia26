-- BAC-PEDIA 2027: separated learner, contributor and single-owner admin roles.
-- Administrator assignment MUST be performed by the project owner against a
-- verified Supabase Auth account. No client or public signup can grant admin.
CREATE TABLE IF NOT EXISTS public.platform_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role='admin'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_single_admin
  ON public.platform_roles (role) WHERE role='admin';
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_roles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_roles TO authenticated;
DROP POLICY IF EXISTS "Read own platform role" ON public.platform_roles;
CREATE POLICY "Read own platform role" ON public.platform_roles FOR SELECT TO authenticated
  USING (user_id=(select auth.uid()));

-- Existing students' educational tables remain private.
DROP POLICY IF EXISTS "Owner review contributor applications" ON public.collaborator_applications;
CREATE POLICY "Owner review contributor applications" ON public.collaborator_applications
  FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM public.platform_roles r
      WHERE r.user_id=(select auth.uid()) AND r.role='admin')
  );
DROP POLICY IF EXISTS "Owner review contributor resources" ON public.collaborator_resources;
CREATE POLICY "Owner review contributor resources" ON public.collaborator_resources
  FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM public.platform_roles r
      WHERE r.user_id=(select auth.uid()) AND r.role='admin')
  );

-- An approved contributor may edit their OWN proposal content, never the
-- approval status. No browser role has UPDATE privilege on reviewed_at/status.
GRANT UPDATE (title,subject,description,resource_url)
  ON public.collaborator_resources TO authenticated;
GRANT DELETE ON public.collaborator_resources TO authenticated;
DROP POLICY IF EXISTS "Approved contributors edit own proposals" ON public.collaborator_resources;
CREATE POLICY "Approved contributors edit own proposals" ON public.collaborator_resources
  FOR UPDATE TO authenticated
  USING (
    contributor_id=(select auth.uid()) AND status IN ('pending','rejected')
    AND EXISTS(SELECT 1 FROM public.collaborator_applications a
      WHERE a.user_id=(select auth.uid()) AND a.status='approved')
  )
  WITH CHECK (
    contributor_id=(select auth.uid()) AND status IN ('pending','rejected')
    AND EXISTS(SELECT 1 FROM public.collaborator_applications a
      WHERE a.user_id=(select auth.uid()) AND a.status='approved')
  );
DROP POLICY IF EXISTS "Contributors delete own resources" ON public.collaborator_resources;
CREATE POLICY "Contributors delete own resources" ON public.collaborator_resources
  FOR DELETE TO authenticated
  USING (
    contributor_id=(select auth.uid()) AND
    EXISTS(SELECT 1 FROM public.collaborator_applications a
      WHERE a.user_id=(select auth.uid()) AND a.status='approved')
  );

-- Owner approval functions are narrowly scoped. Their privileged execution
-- bypasses row restrictions only after a hard server-side owner check.
CREATE OR REPLACE FUNCTION public.review_collaborator_application(
  p_user_id uuid, p_decision text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF (select auth.uid()) IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.platform_roles r
    WHERE r.user_id=(select auth.uid()) AND r.role='admin'
  ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('approved','rejected','pending') THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023';
  END IF;
  UPDATE public.collaborator_applications
    SET status=p_decision, reviewed_at=now()
    WHERE user_id=p_user_id;
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.review_collaborator_application(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_collaborator_application(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_collaborator_resource(
  p_resource_id uuid, p_decision text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF (select auth.uid()) IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.platform_roles r
    WHERE r.user_id=(select auth.uid()) AND r.role='admin'
  ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('approved','rejected','pending') THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023';
  END IF;
  UPDATE public.collaborator_resources
    SET status=p_decision, reviewed_at=now()
    WHERE id=p_resource_id;
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.review_collaborator_resource(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_collaborator_resource(uuid,text) TO authenticated;

-- Owner can inspect user profile metadata but never passwords, tokens or
-- private auth secrets. Existing profile RLS and student write policies remain.
DROP POLICY IF EXISTS "Owner read student profiles" ON public.student_profiles;
CREATE POLICY "Owner read student profiles" ON public.student_profiles
 FOR SELECT TO authenticated USING (
   EXISTS(SELECT 1 FROM public.platform_roles r
     WHERE r.user_id=(select auth.uid()) AND r.role='admin')
 );

-- To activate THE SINGLE OWNER: first create and verify the real Supabase
-- login, then run this privately in SQL Editor after replacing the placeholder:
-- INSERT INTO public.platform_roles(user_id,role)
-- SELECT id,'admin' FROM auth.users
-- WHERE lower(email)=lower('OWNER_VERIFIED_EMAIL_HERE')
-- AND email_confirmed_at IS NOT NULL;
-- NEVER grant this role based on signup_intent or user_metadata.
