# Bac-pedia 2027 — Real student login

1. Create a Supabase project at https://supabase.com/dashboard.
2. Run `supabase/schema.sql` in SQL Editor.
3. In Authentication > Providers > Email, enable Email authentication and **Confirm email**.
4. In Authentication > URL Configuration, add your deployed origin to the redirect allow list, including:
   - https://boukhariabdallahyasser-prog.github.io/Bac-pedia26/
   - your Vercel production domain (when known)
5. Open Project Settings > API and copy the Project URL and **publishable** key to `auth-config.js`.
6. Deploy. Test signup, email verification, sign-in, sign-out, password reset, and progress isolation with two different accounts.

Do not put the Supabase secret/service_role key into frontend code or GitHub.
Supabase Auth manages password hashing and sessions. The student_progress table uses row-level security to prevent cross-account access.
The application keeps guest-mode data in the browser; signed-in progress is stored in Postgres.
Production hardening: configure SMTP delivery, CAPTCHA/rate limits, email templates, monitoring, and privacy notices.
