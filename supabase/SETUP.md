# Bac-pedia 2027 — Production setup

This repository is connected to the existing Supabase project:
- Project ref: `vgioqexpyvwmxwtuntaa`
- Project URL: `https://vgioqexpyvwmxwtuntaa.supabase.co`

## Authentication: email + password only

The application intentionally uses only two fields for account creation and sign-in: email and password. It does not show an email-verification screen or require a password-confirmation field.

For hosted Supabase, disable email confirmation:
1. Open [Supabase Auth Providers](https://supabase.com/dashboard/project/vgioqexpyvwmxwtuntaa/auth/providers).
2. Open the **Email** provider.
3. Turn **Confirm email** OFF and save the change.
4. Keep Email/password sign-in enabled.

With confirmation disabled, Supabase should return an authenticated session directly from `signUp()`, allowing the application to sign the student in immediately. If the application reports that no session was returned after signup, check that **Confirm email** is actually OFF in the hosted project.

Disabling confirmation means Supabase does not verify that a new user owns the email address they enter. Use a strong password and consider re-enabling confirmation if verified email ownership becomes a requirement.

## Site and redirect URLs

In Authentication → URL Configuration:
- Site URL: `https://bac-pedia26.vercel.app`
- Production redirect URL: `https://bac-pedia26.vercel.app/**`
- Optional local development URL: `http://localhost:3000/**`

## Email delivery

Custom SMTP is no longer required for signup when **Confirm email** is OFF. The **Forgot password** flow still sends a recovery email, so configure a working SMTP provider if students need password recovery.

For Brevo custom SMTP:
- Host: `smtp-relay.brevo.com`
- Port: `587`
- Sender name: `Bac-pedia 2027`
- Sender email: a verified sender in Brevo
- Username: the exact **Login** value shown on Brevo's SMTP page
- Password: a Brevo **SMTP key**, not an API key or Brevo account password

Never commit SMTP credentials to GitHub.

## Database

Run `supabase/schema.sql` only when provisioning a fresh database or intentionally reconciling schema. The production project already has:
- `student_profiles`
- `student_progress` with per-user RLS
- `ai_usage_daily` with client access denied
- A fixed 30-request daily AI quota per authenticated user

The quota implementation is stored in the non-exposed `private` schema as SECURITY DEFINER; the public RPC wrapper is SECURITY INVOKER and ignores client-supplied quota values.

Never expose the Supabase secret/service-role key in frontend code or GitHub. The browser uses only the publishable key.

## Deployment and verification

Production website: `https://bac-pedia26.vercel.app`

Test after disabling **Confirm email**:
1. Create a new account with email and password only.
2. Verify that the application signs the student in immediately without sending a confirmation email.
3. Refresh and confirm the session is restored.
4. Sign out and confirm the login gate returns.
5. Test password recovery if SMTP is configured.
6. Test two accounts and confirm their progress remains isolated.
