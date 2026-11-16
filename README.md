## 2026-11-16: public Worker URL and reserved admin activation

**Cloudflare URL:** `wrangler.jsonc` sets `workers_dev: true` so the Worker is publicly reachable on its account subdomain, and `keep_vars: true` so deploys do not overwrite secrets/variables managed in Cloudflare Dashboard. The GitHub Actions pipeline makes a non-blocking live check of `/` and `/api/ai` and reports the HTTP status. In Cloudflare, the production GitHub branch must be `main` and the deploy command must be `npx wrangler deploy`. A successful Vite build on its own does not imply public DNS routing is enabled.

**Admin:** The requested owner's email is reserved in **private Supabase database configuration** and is intentionally absent from this repository. No admin password or publicly editable metadata can grant the role. The one-time, database-validated `claim_owner_access` RPC activates the role only after the reserved email registers a genuine Supabase account and email confirmation is complete. Other users receive `false`. The application invokes this RPC after a verified login; the admin dashboard is then revealed by the database-backed role. Use a new, strong password never previously shared in a chat. There is currently no registered owner account until signup and email confirmation occur.

**Email links:** New signup confirmation links now specify `emailRedirectTo: location.origin + location.pathname`, and password recovery already uses the current origin. Ensure both the Cloudflare `workers.dev` host and Vercel backup host are on Supabase Dashboard → Authentication → URL Configuration → Redirect URLs. Cloudflare Dashboard → Workers & Pages → `bac-pedia26` → Settings → Domains & Routes must also have its public `workers.dev` route enabled, and public Cloudflare Access restrictions must not block visitors.

**Deploy.com:** Cloudflare Worker `DEPLOY_API_KEY` must be a **Secret**, not a checked-in Wrangler `vars` value. Rotate any key shared outside the secrets manager, set the replacement secret in the Cloudflare dashboard, and verify a signed-in AI request. Static `GET /api/ai` readiness does not verify the provider key.

## Cloudflare Workers deployment (new hosting)

Cloudflare currently hosts `https://bac-pedia26.boukhariabdallahyasser.workers.dev`.
The first deployment successfully uploaded the **frontend assets only**. Cloudflare does
not automatically execute Vercel's `api/ai.js`. The checked-in `wrangler.jsonc`
and `cloudflare/worker.js` add a real Worker backend on `/api/ai` and send
all other requests to the Vite static assets. The settings implement a
`run_worker_first` API route to avoid SPA fallback returning HTML to API calls.

Cloudflare GitHub project settings:
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Worker name: `bac-pedia26`
- Output folder: `dist`
- Production branch: `main` (keep automatic branch previews optional)

Server-only configuration in **Cloudflare Dashboard → Workers & Pages → bac-pedia26
→ Settings → Variables and Secrets** (never put credentials in GitHub,
`wrangler.jsonc`, `auth-config.js`, or `VITE_*` variables):
- `DEPLOY_API_KEY`: the owner's **Deploy.com** inference API credential, type **Secret**.
- `DEPLOY_API_ENDPOINT`: optional override. The official default is `https://api-cdn.deploy.com/api/v1/chat/completions` (CDN nearest region).
- `DEPLOY_MODEL_ID`: optional override. The official documented default is `deepseek-ai/deepseek-v4.1-flash`.

**Official reference:** https://deployai.readme.io/docs/quickstart and
https://deployai.readme.io/docs/deepseek . Deploy explicitly documents
OpenAI-compatible chat completions with these values. `GET /api/ai` returns
`provider_unconfigured` when the **secret key** is missing, and
`configured_unverified` when credentials are present. A configured status
does **not** prove that a key is valid or that the owner's Deploy account has
access to the chosen model. Test a real authenticated student request to verify
AI generation. Confirm any model usage charges in the Deploy dashboard.

The Worker verifies the Supabase Auth bearer session, requires email
confirmation, and enforces the existing daily quota through
`consume_ai_quota`. The worker never serves the API credential to the browser.

For signup confirmation and password recovery on Cloudflare, add the exact
`workers.dev` origin to **Supabase Authentication → URL Configuration → Redirect URLs**.
Keep Vercel in the redirect list during the transition. Change the default
`Site URL` only after testing signup and recovery end to end on Cloudflare.
Do not delete the older Vercel deployment until then.

Test locally with `npm test` and `npm run build`. Use `npm run cf:preview`
for Worker testing, and `npm run cf:deploy` to publish only after validation.

## 2026-11-16: role-separated dashboards and moderation

The platform now has three database-backed experiences. **Student** users see only learning tools plus approved resources; **contributor applicants/approved contributors** see their personal resource-management workspace instead of student pages; and **the one verified owner** sees a moderation dashboard.

### Owner bootstrap (requires the owner's actual verified login)

The database enforces **at most one** `platform_roles.role='admin'`. No publicly submitted name, email, signup intent or `user_metadata` can authorize an administrator. The owner should first register an ordinary account and verify its email via Supabase Auth. Only then the project administrator can run the documented INSERT in `supabase/role_portals_admin_2026.sql` from the **private Supabase SQL Editor**, substituting that account's exact verified email. Never add the owner password to GitHub or Vercel. Until the verified account is explicitly associated, the admin dashboard is intentionally inaccessible.

### Contributor workspace

A contributor signup collects full name, email/password, organization, contributor category and motivation. After confirmation, an application is stored as pending in `collaborator_applications`. A database-approved contributor sees resource statistics and can add, edit or delete their own Google Drive resource proposals (title, subject, unit/chapter, type, URL and description). New resources remain private to owner/contributor until the administrator approves them.

The owner dashboard uses owner-only checked RPCs for approval, rejection, revocation, publication and deletion. Revoking a contributor also withdraws all their approved and pending links. Actions are logged in `moderation_audit`. Every security-changing action is enforced in PostgreSQL rather than by hiding UI buttons. Students never receive links to contributor or admin dashboards. Approved educational links appear in their existing Files view, without publishing the contributor management interface.

### Deploy.com AI provider

AI generation is handled by Deploy.com, not Gemini. The **official Deploy quickstart**
confirms the OpenAI-compatible chat completions API and the documented default
model (`deepseek-ai/deepseek-v4.1-flash`) at
`https://api-cdn.deploy.com/api/v1/chat/completions`. Both Vercel and Cloudflare
adapters use these as defaults and allow secure server-side overrides.

**Required for Cloudflare:** set `DEPLOY_API_KEY` as a Cloudflare Worker secret.
Setting it previously on Vercel does not copy it to Cloudflare. A published
`workers.dev` deployment can serve the site while the AI endpoint remains
unconfigured. Always test a signed-in student's first AI request and check the
Deploy service's billing/authorization. Never embed secrets in JavaScript.

### Migrations and security tests

The following migrations have been applied to the connected Supabase project: `role_portals_admin_2026.sql`, `resource_categories_2026.sql`, and `admin_moderation_audit_2026.sql`. All previously saved student progress and retired flashcard data are preserved. RLS protects individual records; an immutable-style moderation audit records privileged decisions. The privileged moderation implementations live in the private `bac_private` schema with an empty search path and explicit owner checks. The public API exposes only SECURITY INVOKER wrappers; the private schema is not part of the exposed Supabase Data API. The owner dashboard also displays a private moderation audit log.

Run `npm test`, `npm run build`, and `node scripts/check-dist.mjs` before merging, then check the Vercel preview. Real signup, SMTP confirmation, contributor approval and cross-account RLS require authenticated browser tests. Supabase Auth leaked-password protection must be enabled separately in Auth settings.

## 2026-11-16: landing page and AI configuration follow-up

- Public landing now scrolls vertically on desktop and mobile. The global logged-out overflow lock is overridden only while a login modal is **not** open. Navigation anchors scroll to their target sections.
- The public Flashcards preview and the student Flashcards interface have been retired at the owner's request. Its previous database tables and saved student decks remain untouched to avoid destructive data loss. They are no longer shown in the app.
- Collaborator applications and reviewed resource submissions remain operational.
- The project's AI credential is stored server-side in Vercel's **sensitive** `GEMINI_API_KEY` variable for production and preview. Never commit its value to the repository or expose it in a client-side build. The backend readiness endpoint determines whether Google accepts the supplied credential; setting it alone does not establish validity.
- Updating Vercel environment variables requires a fresh deployment to affect serverless functions. Check `GET /api/ai` after deployment, and test an authenticated prompt with a verified account.

# Bac-pedia 2027

Arabic-first, RTL study platform for Algerian baccalaureate students preparing for the examination on **15 June 2027**.

## Modern web stack (2026)

| Layer | Technology |
| --- | --- |
| Frontend build | **Vite 8.3.8** (bundled entry, CSS, fast local development) |
| Browser API | Vanilla JavaScript with a progressive migration away from classic scripts |
| Authentication, database, RLS | **Supabase** with pinned `@supabase/supabase-js@2.119.0` |
| Serverless backend | **Vercel Functions** (`api/ai.js`) |
| AI service | Server-side Gemini proxy; usage quota checked in Supabase |
| Study materials | `resources.json` and verified Google Drive URLs |
| CI | GitHub Actions: syntax/security checks, manifest checks, Vite build, output verification |

The old giant `index.html` has been split into page markup, `assets/app.css` (legacy styles), `assets/legacy-app.js` (classic global event handlers) and `src/main.js` (bundled startup). **This is an incremental modernization, not a React or Next.js rewrite**. Existing logins and the AI API keep their original contracts. The Vite build copies the trusted static inventory and authentication publishable config into `dist/`, while the Vercel serverless function remains under `api/`.

```bash
npm install
npm run dev
npm test
npm run build
node scripts/check-dist.mjs
```

Node.js 22.12+ is required. To deploy on Vercel, use Framework Preset **Vite**, Build Command `npm run build`, Output Directory `dist`, and keep the root `api/` function. The `GEMINI_API_KEY` must remain server-only. Never add `VITE_GEMINI_API_KEY` or service-role credentials to client bundles. A green Vite build does **not** verify live Supabase Auth/SMTP or Google Drive sharing.

## Bac-pedia 2027 public landing and student / collaborator experience

The public entry point is a redesigned Arabic-first landing page. Visitors can explore the product, supported Mathematics, Experimental Sciences and Technical Mathematics divisions, and a self-contained interactive flashcard preview before creating an account. The real student application and progress data appear only after Supabase authentication and email confirmation. The existing private learning features are retained.

### Two signup journeys

- **Student:** name, email, password, email confirmation, then personal learning dashboard, chapters, grades, planner, and new cloud-backed Flashcards.
- **Collaborator:** the same verified personal account, marked with `signup_intent: 'collaborator'` as **onboarding context only**. A submitted `collaborator_applications` record is created from the separate contributor form. Its approval status cannot be changed by the applicant. Admins review applications in the Supabase dashboard before a contributor can submit verified Google Drive resource links. Submitted links are private until reviewed and approved by an administrator.

**Security:** Browser-controlled metadata or role tabs never confer collaborator authorization. PostgreSQL RLS and restricted insert-column grants enforce permissions. No anonymous user can read private decks, cards, profiles, or contributions awaiting review. The privileged service role key is never bundled into the browser.

### Flashcards

Every student can create private decks with a subject, add front/back cards, flip them, study due cards, and schedule review for 10 minutes, the next day, or after a growing interval. Tables: `flashcard_decks` and `flashcard_cards` with owner-only RLS, cascading deletion through database keys, and indexed due dates. Unlike a static UI demo, these cards persist in Supabase and are scoped to the logged-in account.

### Database deployment

Migration `supabase/landing_collaboration_flashcards.sql` has been applied to the connected Supabase project. Its tables are `collaborator_applications`, `collaborator_resources`, `flashcard_decks`, and `flashcard_cards`. Existing `student_progress`, `student_profiles`, `ai_usage_daily` and `student_resource_bookmarks` were not replaced or cleared.

**Administrator action:** to approve an applicant, a trusted database administrator must update `public.collaborator_applications.status` to `approved` through authenticated database administration, after verifying the applicant. For published submissions, review `collaborator_resources` and update `status` to `approved`. Never provide this permission to the `authenticated` browser role.

### Local development and release checks

Run `npm install`, `npm test`, `npm run build` and `node scripts/check-dist.mjs`. The CI guards now verify that the landing page, signup controls, flashcard flows, RLS migration, required compiled CSS and JS are present. Real email delivery, student login, database CRUD, and cross-user privacy require authenticated end-to-end testing with separate test accounts.

## Application architecture

- `index.html`: Arabic RTL page markup, loaded by Vite.
- `src/main.js`: bundled entry and pinned Supabase SDK adapter.
- `assets/app.css` and `assets/legacy-app.js`: extracted styles and legacy application behavior.
- `vite.config.js`: reproducible frontend output and static asset copy rules.
- `auth-config.js`: public Supabase project URL and publishable key only. Never put a Supabase secret/service-role key or Gemini key here.
- `api/ai.js`: Vercel serverless AI endpoint. It verifies the Supabase bearer token, requires a confirmed email, validates the request, enforces the database-backed daily quota, and calls Gemini 3.8 Flash using `GEMINI_API_KEY` from the server environment.
- `resources.json`: checked-in index of Google Drive educational resources. Do not invent Drive IDs or URLs.
- `supabase/schema.sql`: reproducible database schema and security policies.

## Hosting

**Use Vercel for the production application.** Vercel supports the `/api/ai` serverless endpoint. Configure the Vercel project to build with Vite and deploy this repository's `main` branch.

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

## Subject → unit → resource navigation

The `الدروس والوحدات` section now opens each BAC subject on a separate in-app view, followed by the verified folder/unit structure and individual file detail screens. URL fragments such as `#/chapters/math_math` support back/forward navigation and direct links to nested units. The hierarchy is derived from the existing verified `resources.json` catalogue, not AI-generated course titles. If a Drive folder is indexed without its children, the UI explicitly states that its contents have not been indexed and offers the original Drive link.

### Bookmark synchronization

The live Supabase project has a `public.student_resource_bookmarks` table with an owning `user_id`, unique `resource_key`, timestamps, and owner-scoped SELECT/INSERT/UPDATE/DELETE Row Level Security policies. Each student's bookmarks are synchronized to Supabase after login. A user-scoped localStorage cache provides an offline fallback, and failures are indicated rather than silently claimed as synchronized.

### AI service readiness

The `GET /api/ai` endpoint checks whether Gemini is configured and if the server-side model metadata request succeeds. It returns a non-secret `ready` and reason, and does **not** consume a student's AI quota. The UI enables generative tools only after a successful readiness result. Offline study planner, mistakes, and grades tools remain available even without a Gemini API key. Real generation is still performed through the authenticated POST endpoint with Supabase session verification, email confirmation, daily quota, request validation, and `GEMINI_API_KEY` set in Vercel.

### Styling and deployment

Both CSS sources are now explicit HTML stylesheet links. Vercel is explicitly configured to run `npm run build` and serve `dist`, and CI verifies the styles exist inside the generated production output. This avoids serving source HTML without its corresponding compiled styling.

## Verification and caveats

Run `npm test`, `npm run build`, and `node scripts/check-dist.mjs`. Automated checks cover the resource tree, exact links, AI readiness API contract and compiled styles. They cannot replace end-to-end tests using a real student email for signup, SMTP confirmation, password recovery, and Drive access.

Supabase's security advisor currently reports **Leaked Password Protection Disabled**. Enable this in Supabase Dashboard → Authentication → Settings → Password Security: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. This project setting is not changed by database SQL.

## Chapters Studio and smart search

The `الدروس والوحدات` page is a resource-discovery interface backed by `resources.json`, not an independent syllabus or a generated lesson library. It indexes the verified subject roots, resource categories, Drive folders, and listed files for the **currently selected branch and specialization**. Resources unavailable for that specialization must not appear as verified.

- Find materials with Arabic, French, or English names (e.g. `الدوال` / `fonctions`), typo tolerance, normalized Arabic spelling, and optional suggestions.
- Filter by subject, resource type, favorites, and sort order. Use **Ctrl+K / Cmd+K** to focus the chapter search.
- Favorites for individual chapters/files are cached in localStorage under the authenticated student's user-specific key. They are not yet cloud-synced and will not follow the student to another device.
- Manifest loading uses the existing validated in-repository Drive inventory and the limited existing canonical folder fallback. Missing records must not be fabricated.
- Drive folder presence does not guarantee a student can open the resource; verify Drive permissions separately.

Run the related tests with `node scripts/check-chapter-search.mjs`. The standard frontend CI command also validates this script, the new JavaScript bundles, and resource manifest.

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
