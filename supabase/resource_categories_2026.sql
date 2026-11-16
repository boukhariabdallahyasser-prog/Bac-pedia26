-- Optional educational classification of submitted resource links.
ALTER TABLE public.collaborator_resources
 ADD COLUMN IF NOT EXISTS resource_kind text NOT NULL DEFAULT 'other'
 CHECK (resource_kind IN ('lesson','summary','exercise','exam','video','other'));
ALTER TABLE public.collaborator_resources
 ADD COLUMN IF NOT EXISTS unit_title text NOT NULL DEFAULT ''
 CHECK (char_length(unit_title)<=120);
-- A contributor may modify only editable content, never publication status.
GRANT INSERT (resource_kind,unit_title) ON public.collaborator_resources TO authenticated;
GRANT UPDATE (resource_kind,unit_title) ON public.collaborator_resources TO authenticated;
-- A separate immutable note is deliberately not stored. Pending/rejected
-- submissions remain private to owner and contributor until approved.
