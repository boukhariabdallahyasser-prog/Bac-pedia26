-- Defense-in-depth: keep privileged implementations in a non-API schema.
-- Exposed public RPC functions execute as caller and delegate ONLY after
-- the private implementation checks the owner role.
CREATE SCHEMA IF NOT EXISTS bac_private;
REVOKE ALL ON SCHEMA bac_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA bac_private TO authenticated;

ALTER FUNCTION public.review_collaborator_application(uuid,text) SET SCHEMA bac_private;
ALTER FUNCTION public.review_collaborator_resource(uuid,text) SET SCHEMA bac_private;
ALTER FUNCTION public.admin_delete_contributor_resource(uuid) SET SCHEMA bac_private;

REVOKE ALL ON FUNCTION bac_private.review_collaborator_application(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION bac_private.review_collaborator_resource(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION bac_private.admin_delete_contributor_resource(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION bac_private.review_collaborator_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION bac_private.review_collaborator_resource(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION bac_private.admin_delete_contributor_resource(uuid) TO authenticated;

CREATE FUNCTION public.review_collaborator_application(p_user_id uuid,p_decision text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.review_collaborator_application(p_user_id,p_decision); $$;
CREATE FUNCTION public.review_collaborator_resource(p_resource_id uuid,p_decision text)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.review_collaborator_resource(p_resource_id,p_decision); $$;
CREATE FUNCTION public.admin_delete_contributor_resource(p_resource_id uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT bac_private.admin_delete_contributor_resource(p_resource_id); $$;

REVOKE ALL ON FUNCTION public.review_collaborator_application(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_collaborator_resource(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_delete_contributor_resource(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_collaborator_application(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_collaborator_resource(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_contributor_resource(uuid) TO authenticated;
