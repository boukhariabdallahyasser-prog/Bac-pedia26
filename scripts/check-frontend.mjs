import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('assets/legacy-app.js','utf8');
const api=fs.readFileSync('api/ai.js','utf8');
const main=fs.readFileSync('src/main.js','utf8');
const config=fs.readFileSync('vite.config.js','utf8');
const community=fs.readFileSync('assets/community.js','utf8');
const collaborationSchema=fs.readFileSync('supabase/landing_collaboration_flashcards.sql','utf8');
const wranglerConfig=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
if(wranglerConfig.main!=='cloudflare/worker.js')throw Error('Cloudflare must deploy API Worker entrypoint');
if(wranglerConfig.workers_dev!==true)throw Error('Public Cloudflare workers.dev route must be enabled');
if(wranglerConfig.keep_vars!==true)throw Error('Cloudflare deploy must preserve dashboard secrets');

if(wranglerConfig.assets?.binding!=='ASSETS'||!wranglerConfig.assets?.run_worker_first?.includes('/api/*'))throw Error('Cloudflare API routing must run Worker first');

const rolesSql=fs.readFileSync('supabase/role_portals_admin_2026.sql','utf8');
const auditSql=fs.readFileSync('supabase/admin_moderation_audit_2026.sql','utf8');
const claimSql=fs.readFileSync('supabase/verified_owner_activation_2026.sql','utf8');
for(const part of ['email_confirmed_at IS NOT NULL','bac_private.owner_activation','public.platform_roles','CREATE OR REPLACE FUNCTION public.claim_owner_access','SECURITY INVOKER'])requireText(claimSql,part,'secure owner claim');
if(claimSql.includes('abdallahadmin.admin@admin.co'))throw Error('Do not commit owner identity to publicly accessible source');

for(const marker of ['platform_single_admin','REVOKE ALL ON public.platform_roles','review_collaborator_application','review_collaborator_resource'])requireText(rolesSql,marker,'single-owner RLS');
for(const marker of ['CREATE TABLE IF NOT EXISTS public.moderation_audit','status=\'rejected\'','admin_delete_contributor_resource'])requireText(auditSql,marker,'audited moderation');


function requireText(source, marker, label) {
  if(!source.includes(marker))throw Error('Missing '+label+': '+marker);
}

for(const file of ['assets/legacy-app.js','assets/chapter-search.js','assets/chapters.js','assets/landing.js','assets/community.js','src/main.js','vite.config.js','api/ai.js','cloudflare/worker.js']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw Error(file+' has a syntax error:\\n'+result.stderr);
}

requireText(html,'<html lang="ar" dir="rtl">','Arabic RTL interface');
requireText(html,'<script type="module" src="/src/main.js"></script>','Vite entrypoint');
requireText(html,'href="/assets/app.css"','CSS independently loaded');
requireText(html,'href="/assets/chapters.css"','Chapter CSS independently loaded');
requireText(html,'id="chapterBreadcrumbs"','Nested navigation breadcrumb');
requireText(html,'id="chapterContext"','Lesson detail area');
for(const id of ['page-admin','adminList','adminMetrics','collaboratorStatusPanel','contributorMetrics','signupCollabExtras','approvedResourceGrid'])requireText(html,'id="'+id+'"','role-separated interface');
requireText(html,'href="/assets/portals.css"','portal stylesheet');
requireText(html,'data-admin-tab="ai"','admin diagnostic tab');
for(const value of ['async function inspectOwnerAI()','async function testOwnerAI()','agent:\'smart_tutor\'','Authorization:\'Bearer \'+token'])requireText(community,value,'admin-only AI test flow');
for(const marker of ['window.BAC_PORTAL_ROLE','sidebarBranches','sidebarStudyStats',"if(id==='admin')window.renderAdmin"])requireText(app,marker,'role-aware app navigation');

if(html.includes('id="page-flashcards"')||html.includes('id="lpDemoFlashcard"')||html.includes('id="flashcards-preview"'))throw Error('Removed flashcard UI was reintroduced');
const landingCSS=fs.readFileSync('assets/landing.css','utf8');
requireText(landingCSS,'body.public-mode:not(.authenticated):not(.auth-modal-open){overflow-y:auto!important','Public landing must remain vertically scrollable');
for(const id of ['publicLanding','lpHeroTitle','signupKindStudent','signupKindCollaborator','signupNameInput','page-collaborate','collaboratorApplyForm','collabResourceForm'])requireText(html,'id="'+id+'"','public/auth/community UI');
for(const css of ['/assets/landing.css','/assets/community.css'])requireText(html,'href="'+css+'"','new independent CSS');
for(const asset of ['assets/landing.js','assets/community.js'])requireText(config,asset,'Vite runtime packaging');
if(/<script>\\s*[\\s\\S]{100}/.test(html))throw Error('Application logic should not be inline in the HTML');
requireText(config,'resources.json','resource manifest build packaging');
requireText(config,'assets/legacy-app.js','legacy runtime build packaging');
requireText(main,"from '@supabase/supabase-js'",'bundled Supabase dependency');
requireText(main,'window.supabase={createClient}','legacy Supabase adapter');
const bootPaths=['/auth-config.js','/assets/chapter-search.js','/assets/legacy-app.js','/assets/chapters.js','/assets/landing.js','/assets/community.js'];
for(const file of bootPaths)requireText(main,file,'ordered bootstrap');
if(bootPaths.some((file,i)=>i&&main.indexOf(file)<main.indexOf(bootPaths[i-1])))throw Error('Runtime scripts are loaded in an unsafe order');

const authRequirements=[
  'async function initStudentAuth()',
  'onAuthStateChange',
  'function userStorageKey(userId)',
  'async function saveRecoveredPassword()',
  'function togglePasswordVisibility(inputId,button)',
  'function updatePasswordStrength()',
  'let recoveryFlow=',
  'history.replaceState(null',
  'email_confirmed_at',
  'function switchLoginTab(tab)',
  'function openAuthModal(tab=',
  'function setSignupIntent(intent=',
  'window.onCommunityAuthChanged?.()',
  'authCooldownUntil=Date.now()+120000',
  'over_email_send_rate_limit',
  'renderAll();renderSession();closeLoginGate()',
  'if(!u.email_confirmed_at)',
  'if(!data.session){',
  "document.querySelectorAll('#loginGate .login-form button"
];
for(const requirement of authRequirements)requireText(app,requirement,'auth safeguard');
for(const id of ['id="passwordRecoveryPanel"','id="page-chapters"','id="loginGate"','id="chapterResults"'])requireText(html,id,'required interface');
requireText(app,'userStorageKey(studentAuthUser.id)','private student storage key');
if(app.includes('localStorage.getItem(CONFIG.storageKey)'))throw Error('Unscoped progress cache is not allowed');
if(app.includes('window.prompt('))throw Error('Blocking browser prompts are not allowed in authentication');
if(/sessionGeminiKey|x-goog-api-key|generativelanguage\\.googleapis\\.com|CONFIG\\.aiApiKey/.test(app))throw Error('Provider credentials or direct AI calls are not allowed in browser runtime');
requireText(app,'callProxyAI(agentId,ctx)','authenticated AI proxy call');
requireText(app,'signup_intent:signupIntent,...contributorInfo','signup metadata is onboarding only');
requireText(app,'emailRedirectTo:location.origin+location.pathname','confirmation links must return to current origin');
for(const marker of ["from('collaborator_applications')","from('collaborator_resources')","window.onCommunityAuthChanged=","from('platform_roles')","claim_owner_access","review_collaborator_application","review_collaborator_resource","admin_delete_contributor_resource","loadApprovedResources","renderAdmin"])requireText(community,marker,'role-separated dashboard flow');
for(const marker of ['alter table public.flashcard_decks enable row level security','alter table public.flashcard_cards enable row level security','alter table public.collaborator_applications enable row level security','alter table public.collaborator_resources enable row level security','grant insert (user_id,display_name,organization,contribution_type,motivation)','grant insert (contributor_id,title,subject,description,resource_url)'])requireText(collaborationSchema,marker,'protected database schema');
if(/grant\s+update[^;]*\s+on\s+public\.collaborator_(applications|resources)\s+to\s+authenticated/i.test(collaborationSchema))throw Error('Collaborators must not be able to self-approve their status');

for(const marker of ['match(/^Bearer\\s+(.+)$/i)','/rest/v1/rpc/consume_ai_quota','email_confirmed_at','DEPLOY_API_KEY','DEPLOY_API_ENDPOINT','DEPLOY_MODEL_ID'])requireText(api,marker,'Deploy server-side security');
if(/GEMINI_API_KEY|generativelanguage\\.googleapis\\.com|gemini-3\\./.test(api))throw Error('Unexpected obsolete Gemini integration');

for(const file of ['scripts/check-chapter-search.mjs','scripts/check-chapter-navigation.mjs','scripts/check-ai-health.mjs','scripts/check-cloudflare-worker.mjs','scripts/validate-resources.mjs']){
  const result=spawnSync(process.execPath,[file],{encoding:'utf8'});
  if(result.status!==0)throw Error(file+' failed:\\n'+(result.stderr||result.stdout));
  console.log((result.stdout||'').trim());
}
console.log('Bac-pedia source checks passed: Vite entry, modular scripts, auth guards, API, chapter search, resource catalog.');
