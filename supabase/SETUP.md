# Bac-pedia 2027 — Production setup

This repository is already connected to the existing Supabase project:
- Project ref: `vgioqexpyvwmxwtuntaa`
- Project URL: `https://vgioqexpyvwmxwtuntaa.supabase.co`

## Authentication

1. In Authentication → Providers → Email, keep Email enabled and **Confirm email** enabled.
2. In Authentication → URL Configuration, set the Site URL to the production Vercel origin:
   `https://bac-pedia26.vercel.app`
3. Add the production redirect URL:
   `https://bac-pedia26.vercel.app/**`
4. Add a localhost redirect only for local development, for example `http://localhost:3000/**`.
5. Do not disable email confirmation to work around SMTP failures. The application requires a verified account before access.

## Brevo custom SMTP

Configure Custom SMTP in Supabase Auth with:
- Host: `smtp-relay.brevo.com`
- Port: `587`
- Sender name: `Bac-pedia 2027`
- Sender email: a verified sender in Brevo
- Username: copy the exact **Login** value shown on Brevo's SMTP page. It is not necessarily the sender email and must not be the relay hostname.
- Password: a Brevo **SMTP key**, not an API key or Brevo account password.

If Brevo returns `535 5.7.8 Authentication failed`, verify the exact SMTP Login and SMTP key, remove spaces/newlines, and try a short SMTP key if the SMTP client truncates long passwords. Never commit SMTP credentials to GitHub.

## Database

Run `supabase/schema.sql` only when provisioning a fresh database or intentionally reconciling schema. The existing production project already has:
- `student_profiles`
- `student_progress` with per-user RLS
- `ai_usage_daily` with client access denied
- A fixed 30-request daily AI quota per authenticated user

The quota implementation is stored in the non-exposed `private` schema as SECURITY DEFINER; the public RPC wrapper is SECURITY INVOKER and ignores client-supplied quota values.

Never expose the Supabase secret/service-role key in frontend code or GitHub. The browser uses only the publishable key.

## Deployment and verification

The production application is deployed through the existing Vercel project:
`https://bac-pedia26.vercel.app`

After changing authentication or SMTP settings, test:
1. Sign up with a new email address.
2. Confirm the email using the link.
3. Sign in.
4. Refresh and confirm the session is restored.
5. Sign out and confirm the login gate returns.
6. Test password recovery.
7. Test two accounts and confirm their progress remains isolated.

A successful Vercel deployment does not prove SMTP delivery. Confirm the email arrives and check Supabase Auth logs for SMTP errors.
