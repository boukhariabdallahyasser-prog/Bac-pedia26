-- Persist an admin inbox entry whenever an approved contributor submits or updates a resource.
-- Notifications are private to the single verified platform owner and delivered live through Supabase Realtime.

ALTER TABLE public.collaborator_resources
  DROP CONSTRAINT IF EXISTS collaborator_resources_resource_url_check;

ALTER TABLE public.collaborator_resources
  ADD CONSTRAINT collaborator_resources_resource_url_https_check
  CHECK (
    char_length(resource_url) BETWEEN 10 AND 2000
    AND resource_url ~ '^https://[[:alnum:]][[:alnum:].-]*\.[[:alpha:]]{2,}(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
  );

COMMENT ON COLUMN public.collaborator_resources.resource_url IS
  'HTTPS URL to a learning resource. Supports Google Drive, OneDrive, Dropbox, YouTube, Notion and other HTTPS providers.';

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.collaborator_resources(id) ON DELETE SET NULL,
  contributor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_name text NOT NULL DEFAULT 'مساهم',
  event_type text NOT NULL CHECK (event_type IN ('resource_submitted','resource_updated','resource_resubmitted')),
  resource_title text NOT NULL,
  resource_subject text NOT NULL,
  resource_description text NOT NULL DEFAULT '',
  resource_url text NOT NULL,
  resource_kind text NOT NULL DEFAULT 'other',
  unit_title text NOT NULL DEFAULT '',
  academic_branch text NOT NULL DEFAULT 'جميع الشعب',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifications_recipient_unread_created_idx
  ON public.admin_notifications (recipient_id, is_read, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_notifications FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.admin_notifications TO authenticated;
GRANT UPDATE (is_read) ON TABLE public.admin_notifications TO authenticated;

DROP POLICY IF EXISTS "Owner reads own admin notifications" ON public.admin_notifications;
CREATE POLICY "Owner reads own admin notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Owner marks own admin notifications read" ON public.admin_notifications;
CREATE POLICY "Owner marks own admin notifications read"
  ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING (
    recipient_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  )
  WITH CHECK (
    recipient_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.platform_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION bac_private.notify_admin_on_contributor_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event text;
  v_contributor_name text;
BEGIN
  -- Admin edits must never generate a notification to the same admin.
  IF EXISTS (
    SELECT 1 FROM public.platform_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_event := 'resource_submitted';
  ELSE
    IF OLD.status = 'pending'
       AND NEW.title IS NOT DISTINCT FROM OLD.title
       AND NEW.subject IS NOT DISTINCT FROM OLD.subject
       AND NEW.academic_branch IS NOT DISTINCT FROM OLD.academic_branch
       AND NEW.description IS NOT DISTINCT FROM OLD.description
       AND NEW.resource_url IS NOT DISTINCT FROM OLD.resource_url
       AND NEW.resource_kind IS NOT DISTINCT FROM OLD.resource_kind
       AND NEW.unit_title IS NOT DISTINCT FROM OLD.unit_title THEN
      RETURN NEW;
    END IF;

    v_event := CASE
      WHEN OLD.status = 'rejected' THEN 'resource_resubmitted'
      ELSE 'resource_updated'
    END;
  END IF;

  SELECT COALESCE(a.display_name, 'مساهم')
    INTO v_contributor_name
  FROM public.collaborator_applications a
  WHERE a.user_id = NEW.contributor_id;

  INSERT INTO public.admin_notifications (
    recipient_id, resource_id, contributor_id, contributor_name,
    event_type, resource_title, resource_subject, resource_description,
    resource_url, resource_kind, unit_title, academic_branch
  )
  SELECT
    r.user_id, NEW.id, NEW.contributor_id,
    COALESCE(v_contributor_name, 'مساهم'),
    v_event, NEW.title, NEW.subject, COALESCE(NEW.description, ''),
    NEW.resource_url, NEW.resource_kind, COALESCE(NEW.unit_title, ''),
    COALESCE(NEW.academic_branch, 'جميع الشعب')
  FROM public.platform_roles r
  WHERE r.role = 'admin';

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION bac_private.notify_admin_on_contributor_resource()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_admin_on_contributor_resource
  ON public.collaborator_resources;

CREATE TRIGGER notify_admin_on_contributor_resource
  AFTER INSERT OR UPDATE ON public.collaborator_resources
  FOR EACH ROW
  EXECUTE FUNCTION bac_private.notify_admin_on_contributor_resource();

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'admin_notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
  END IF;
END;
$publication$;
