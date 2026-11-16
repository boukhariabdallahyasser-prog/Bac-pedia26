-- BAC-PEDIA 2027: compulsory academic stream for contributor profiles and Drive resources;
-- owner-only resource/profile editing and safe re-submission. No admin emails, API keys or passwords.
-- Only authenticated and email-verified users can obtain their own session.
ALTER TABLE public.collaborator_applications
  ADD COLUMN IF NOT EXISTS academic_branch text;
UPDATE public.collaborator_applications
  SET academic_branch='جميع الشعب'
  WHERE academic_branch IS NULL OR btrim(academic_branch)='';
ALTER TABLE public.collaborator_applications
  ALTER COLUMN academic_branch SET NOT NULL;
ALTER TABLE public.collaborator_applications
  ADD CONSTRAINT collaborator_academic_branch_valid CHECK (
    academic_branch IN ('جميع الشعب','رياضيات','علوم تجريبية','تقني رياضي','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية')
  );
GRANT INSERT (academic_branch) ON public.collaborator_applications TO authenticated;
GRANT UPDATE (display_name,organization,contribution_type,motivation,academic_branch)
  ON public.collaborator_applications TO authenticated;
DROP POLICY IF EXISTS "Applicants edit pending profile details" ON public.collaborator_applications;
CREATE POLICY "Applicants edit pending profile details"
 ON public.collaborator_applications FOR UPDATE TO authenticated
 USING ((select auth.uid())=user_id AND status IN ('pending','rejected'))
 WITH CHECK ((select auth.uid())=user_id AND status IN ('pending','rejected'));

ALTER TABLE public.collaborator_resources
  ADD COLUMN IF NOT EXISTS academic_branch text;
UPDATE public.collaborator_resources
 SET academic_branch='جميع الشعب'
 WHERE academic_branch IS NULL OR btrim(academic_branch)='';
ALTER TABLE public.collaborator_resources
  ALTER COLUMN academic_branch SET NOT NULL;
ALTER TABLE public.collaborator_resources
  ADD CONSTRAINT resource_academic_branch_valid CHECK (
    academic_branch IN ('جميع الشعب','رياضيات','علوم تجريبية','تقني رياضي','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية')
  );
ALTER TABLE public.collaborator_resources
  ADD CONSTRAINT resource_explained CHECK (char_length(btrim(description)) BETWEEN 12 AND 2000);
ALTER TABLE public.collaborator_resources
  ADD CONSTRAINT resource_unit_required CHECK (char_length(btrim(unit_title)) BETWEEN 2 AND 120);
GRANT INSERT (academic_branch) ON public.collaborator_resources TO authenticated;
GRANT UPDATE (academic_branch) ON public.collaborator_resources TO authenticated;

-- Allow an accepted contributor to resubmit their own REJECTED resource for review.
CREATE OR REPLACE FUNCTION bac_private.resubmit_contributor_resource(p_resource_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE caller uuid:=(select auth.uid());
BEGIN
 IF caller IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.collaborator_applications a
   WHERE a.user_id=caller AND a.status='approved'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 UPDATE public.collaborator_resources
 SET status='pending',reviewed_at=NULL
 WHERE id=p_resource_id AND contributor_id=caller AND status='rejected';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION bac_private.resubmit_contributor_resource(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bac_private.resubmit_contributor_resource(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.resubmit_contributor_resource(p_resource_id uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.resubmit_contributor_resource(p_resource_id); $$;
REVOKE ALL ON FUNCTION public.resubmit_contributor_resource(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resubmit_contributor_resource(uuid) TO authenticated;

-- Editing does not automatically publish a resource or modify its contributor.
-- Owner's original review decision remains visible and edits are audited.
CREATE OR REPLACE FUNCTION bac_private.admin_update_curated_resource(
 p_resource_id uuid,p_title text,p_academic_branch text,p_subject text,
 p_resource_kind text,p_unit_title text,p_description text,p_resource_url text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE caller uuid:=(select auth.uid());
BEGIN
 IF caller IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.platform_roles r WHERE r.user_id=caller AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 4 AND 180
  OR p_academic_branch NOT IN ('جميع الشعب','رياضيات','علوم تجريبية','تقني رياضي','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية')
  OR char_length(btrim(coalesce(p_subject,''))) NOT BETWEEN 2 AND 100
  OR p_resource_kind NOT IN ('lesson','summary','exercise','exam','video','other')
  OR char_length(btrim(coalesce(p_unit_title,''))) NOT BETWEEN 2 AND 120
  OR char_length(btrim(coalesce(p_description,''))) NOT BETWEEN 12 AND 2000
  OR p_resource_url !~ '^https://drive\.google\.com/(drive/folders/|file/d/)'
 THEN RAISE EXCEPTION 'Invalid resource details' USING ERRCODE='22023'; END IF;
 UPDATE public.collaborator_resources SET
   title=btrim(p_title),academic_branch=p_academic_branch,
   subject=btrim(p_subject),resource_kind=p_resource_kind,
   unit_title=btrim(p_unit_title),description=btrim(p_description),
   resource_url=btrim(p_resource_url)
 WHERE id=p_resource_id;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.moderation_audit(admin_id,action,target_id,decision)
 VALUES(caller,'resource',p_resource_id::text,'edited');
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION bac_private.admin_update_curated_resource(uuid,text,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bac_private.admin_update_curated_resource(uuid,text,text,text,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_update_curated_resource(
 p_resource_id uuid,p_title text,p_academic_branch text,p_subject text,
 p_resource_kind text,p_unit_title text,p_description text,p_resource_url text
) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.admin_update_curated_resource(
 p_resource_id,p_title,p_academic_branch,p_subject,p_resource_kind,
 p_unit_title,p_description,p_resource_url
); $$;
REVOKE ALL ON FUNCTION public.admin_update_curated_resource(uuid,text,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_curated_resource(uuid,text,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION bac_private.admin_update_contributor_profile(
 p_user_id uuid,p_display_name text,p_organization text,p_contribution_type text,
 p_motivation text,p_academic_branch text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE caller uuid:=(select auth.uid());
BEGIN
 IF caller IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.platform_roles r WHERE r.user_id=caller AND r.role='admin'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF char_length(btrim(coalesce(p_display_name,''))) NOT BETWEEN 2 AND 100
  OR char_length(btrim(coalesce(p_organization,''))) NOT BETWEEN 2 AND 150
  OR p_contribution_type NOT IN ('student','teacher','club','organization','other')
  OR char_length(btrim(coalesce(p_motivation,''))) NOT BETWEEN 15 AND 2000
  OR p_academic_branch NOT IN ('جميع الشعب','رياضيات','علوم تجريبية','تقني رياضي','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية')
 THEN RAISE EXCEPTION 'Invalid contributor details' USING ERRCODE='22023'; END IF;
 UPDATE public.collaborator_applications SET
  display_name=btrim(p_display_name),organization=btrim(p_organization),
  contribution_type=p_contribution_type,motivation=btrim(p_motivation),
  academic_branch=p_academic_branch
 WHERE user_id=p_user_id;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.moderation_audit(admin_id,action,target_id,decision)
 VALUES(caller,'application',p_user_id::text,'edited');
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION bac_private.admin_update_contributor_profile(uuid,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bac_private.admin_update_contributor_profile(uuid,text,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_update_contributor_profile(
 p_user_id uuid,p_display_name text,p_organization text,p_contribution_type text,
 p_motivation text,p_academic_branch text
) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.admin_update_contributor_profile(
 p_user_id,p_display_name,p_organization,p_contribution_type,p_motivation,p_academic_branch
); $$;
REVOKE ALL ON FUNCTION public.admin_update_contributor_profile(uuid,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_contributor_profile(uuid,text,text,text,text,text) TO authenticated;
