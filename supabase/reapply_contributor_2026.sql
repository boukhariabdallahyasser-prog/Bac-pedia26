-- Applicants may resubmit their OWN rejected profile. Approval remains admin-only.
CREATE OR REPLACE FUNCTION bac_private.resubmit_collaborator_application()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE caller uuid:=(select auth.uid());
BEGIN
 IF caller IS NULL THEN RETURN false; END IF;
 UPDATE public.collaborator_applications
 SET status='pending',reviewed_at=NULL
 WHERE user_id=caller AND status='rejected'
   AND academic_branch IN ('جميع الشعب','رياضيات','علوم تجريبية','تقني رياضي','تسيير واقتصاد','آداب وفلسفة','لغات أجنبية')
   AND char_length(btrim(display_name))>=2
   AND char_length(btrim(organization))>=2
   AND char_length(btrim(motivation))>=15;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION bac_private.resubmit_collaborator_application() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bac_private.resubmit_collaborator_application() TO authenticated;
CREATE OR REPLACE FUNCTION public.resubmit_collaborator_application()
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.resubmit_collaborator_application(); $$;
REVOKE ALL ON FUNCTION public.resubmit_collaborator_application() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resubmit_collaborator_application() TO authenticated;
