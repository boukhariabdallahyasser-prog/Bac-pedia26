-- Owner moderation audit and account revocation with automatic unpublishing.
CREATE TABLE IF NOT EXISTS public.moderation_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 admin_id uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL CHECK (action IN ('application','resource','delete_resource')),
 target_id text NOT NULL,
 decision text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.moderation_audit TO authenticated;
DROP POLICY IF EXISTS "Owner read audit" ON public.moderation_audit;
CREATE POLICY "Owner read audit" ON public.moderation_audit FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.platform_roles r
              WHERE r.user_id=(select auth.uid()) AND r.role='admin'));
CREATE OR REPLACE FUNCTION public.review_collaborator_application(
 p_user_id uuid,p_decision text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF (select auth.uid()) IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.platform_roles r
   WHERE r.user_id=(select auth.uid()) AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_decision NOT IN ('approved','rejected','pending')
 THEN RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023'; END IF;
 UPDATE public.collaborator_applications SET status=p_decision,reviewed_at=now()
 WHERE user_id=p_user_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_decision='rejected' THEN
   UPDATE public.collaborator_resources SET status='rejected',reviewed_at=now()
   WHERE contributor_id=p_user_id AND status IN ('approved','pending');
 END IF;
 INSERT INTO public.moderation_audit(admin_id,action,target_id,decision)
 VALUES ((select auth.uid()),'application',p_user_id::text,p_decision);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.review_collaborator_application(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_collaborator_application(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.review_collaborator_resource(
 p_resource_id uuid,p_decision text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF (select auth.uid()) IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.platform_roles r
   WHERE r.user_id=(select auth.uid()) AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_decision NOT IN ('approved','rejected','pending')
 THEN RAISE EXCEPTION 'Invalid decision' USING ERRCODE='22023'; END IF;
 IF p_decision='approved' AND NOT EXISTS (
   SELECT 1 FROM public.collaborator_resources c
   JOIN public.collaborator_applications a ON a.user_id=c.contributor_id
   WHERE c.id=p_resource_id AND a.status='approved'
 ) THEN RAISE EXCEPTION 'Contributor not approved' USING ERRCODE='23514'; END IF;
 UPDATE public.collaborator_resources SET status=p_decision,reviewed_at=now()
 WHERE id=p_resource_id;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.moderation_audit(admin_id,action,target_id,decision)
 VALUES ((select auth.uid()),'resource',p_resource_id::text,p_decision);
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.review_collaborator_resource(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_collaborator_resource(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_delete_contributor_resource(p_resource_id uuid)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF (select auth.uid()) IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.platform_roles r
   WHERE r.user_id=(select auth.uid()) AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 DELETE FROM public.collaborator_resources WHERE id=p_resource_id;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.moderation_audit(admin_id,action,target_id,decision)
 VALUES ((select auth.uid()),'delete_resource',p_resource_id::text,'deleted');
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.admin_delete_contributor_resource(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_contributor_resource(uuid) TO authenticated;
