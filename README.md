# Bac-pedia 2027

Arabic-first, RTL study platform for Algerian baccalaureate students preparing for the examination on **15 June 2027**.

## Application architecture

- `index.html`: responsive student application and authentication interface.
- `auth-config.js`: public Supabase project URL and publishable key only. Never put a Supabase secret/service-role key or Gemini key here.
- `api/ai.js`: Vercel serverless AI endpoint. It verifies the Supabase bearer token, requires a confirmed email, validates the request, enforces the database-backed daily quota, and calls Gemini 3.8 Flash using `GEMINI_API_KEY` from the server environment.
- `resources.json`: checked-in index of Google Drive educational resources. Do not invent Drive IDs or URLs.
- `supabase/schema.sql`: reproducible database schema and security policies.

## Hosting

**Use Vercel for the production application.** Vercel supports the `/api/ai` serverless endpoint. Configure the Vercel project to deploy this repository's `main` branch.

GitHub Pages can serve the static HTML application, but it cannot execute `api/ai.js`; the AI proxy is intentionally disabled on `.github.io` hosts. A static GitHub Pages deployment is not the complete production backend.

## Supabase

The application uses the existing Supabase project:

- Supabase Auth for email/password accounts, sessions and email confirmation.
- `student_profiles` for name, email, branch, specialization and last activity.
- `student_progress` for student-specific study state.
- `ai_usage_daily` for atomic per-user daily AI request accounting.

Row Level Security is enabled. Student progress and profile reads are scoped to `auth.uid()`. The AI usage table has no direct client privileges and a deny-all client policy; only the quota function can increment usage.

The AI quota is **30 admitted requests per authenticated student per UTC day**. The `consume_ai_quota` function is intentionally `SECURITY DEFINER`: it performs one atomic increment and returns only whether the student's quota remains available. It does not return another student's usage or allow client edits to the counter.

## Environment configuration

Set this variable in the Vercel project's server-side Production environment (and Preview if needed):

- `GEMINI_API_KEY`: Gemini API key. Never expose it in browser code, `auth-config.js`, Git history, or chat.

The Supabase publishable key in `auth-config.js` is designed for browser use; database access remains protected by RLS.

Configure Supabase Auth:
1. Enable email confirmations.
2. Enable leaked-password protection.
3. Set the production Site URL to the Vercel domain.
4. Add the exact production and preview callback URLs to the allowed redirect URLs.

## Educational resources and access

The connected Drive root supplied for the project is the Mathematics-stream library. Programme mapping is intentionally branch-aware:

- Mathematics and Technical Mathematics share the verified Mathematics and Physics folders.
- Experimental Sciences keeps separate Mathematics and Physics subjects; no matching Science-stream folders are marked available until their own sources are connected.
- Natural Sciences uses the same verified folder for Mathematics and Experimental Sciences.
- Arabic, French, English, History/Geography, Philosophy and Islamic Education use shared resources for Mathematics, Experimental Sciences and Technical Mathematics where the programme is common.
- Technical Mathematics: the separate Technology folder contains verified Electrical Engineering resources (summaries/lessons, topics, exercises and books). It is shown only when the Electrical specialization is selected.
- Civil Engineering, Mechanical Engineering and Process Engineering are not marked available: no dedicated Drive resource folders were found in the inspected sources. The UI must not link them to the Electrical Engineering folder.
- The experimental-baccalaureate folder is indexed separately and shown only for Mathematics and Experimental Sciences; the Mathematics-stream previous-exam folder remains Mathematics-only.

Resource records are validated for structure, HTTPS Google Drive URLs, Drive IDs and parent relationships:

```bash
node scripts/validate-resources.mjs
```

The manifest currently records `access_not_verified`. A successful administrator listing does not prove anonymous students can open a Drive file. Test each intended folder with a non-owner account and set Google Drive sharing deliberately. A public Drive link remains public even when the application itself requires login; hiding a link behind authentication does not make the underlying Drive resource private.

No private Supabase Storage bucket is currently configured.

## Checks

The GitHub Actions workflow `Check Bac-pedia frontend` validates every inline JavaScript block, checks `api/ai.js` as an ES module, and verifies the critical AI authorization/quota guards.

```bash
node scripts/check-frontend.mjs
node scripts/validate-resources.mjs
```

## Important operational note

A passing syntax/CI check does not replace live tests of registration, email confirmation, password recovery, two-account RLS isolation, Vercel environment variables, Gemini responses, and mobile browser behavior. Those must be verified against the production deployment before calling the platform production-ready.
