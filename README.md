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
