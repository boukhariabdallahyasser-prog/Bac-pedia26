import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const html=fs.readFileSync('index.html','utf8');
const loginHtml=fs.readFileSync('login/index.html','utf8');
const studentHtml=fs.readFileSync('student/index.html','utf8');
const contributorHtml=fs.readFileSync('contributor/index.html','utf8');
const adminHtml=fs.readFileSync('admin/index.html','utf8');
const app=fs.readFileSync('assets/legacy-app.js','utf8');
const api=fs.readFileSync('api/ai.js','utf8');
const main=fs.readFileSync('src/main.js','utf8');
const config=fs.readFileSync('vite.config.js','utf8');
const community=fs.readFileSync('assets/community.js','utf8');
const collaborationSchema=fs.readFileSync('supabase/landing_collaboration_flashcards.sql','utf8');
const curatorSql=fs.readFileSync('supabase/contributor_curator_fields_2026.sql','utf8');
const reapplySql=fs.readFileSync('supabase/reapply_contributor_2026.sql','utf8');
for(const token of ['bac_private.resubmit_collaborator_application','user_id=caller',"status='rejected'",'SECURITY INVOKER'])
  requireText(reapplySql,token,'safe contributor reapplication');

for(const token of ['collaborator_academic_branch_valid','resource_academic_branch_valid',
  'resource_explained','resource_unit_required','admin_update_curated_resource',
  'admin_update_contributor_profile','resubmit_contributor_resource','SECURITY INVOKER'])
  requireText(curatorSql,token,'secure contributor moderation migration');
if(curatorSql.includes('admin-yasser.ad@ad.co'))throw Error('Never store owner email in source');

const wranglerConfig=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
if(wranglerConfig.main!=='cloudflare/worker.js')throw Error('Cloudflare must deploy API Worker entrypoint');
if(wranglerConfig.workers_dev!==true)throw Error('Public Cloudflare workers.dev route must be enabled');
if(wranglerConfig.keep_vars!==true)throw Error('Cloudflare deploy must preserve dashboard secrets');

if(wranglerConfig.assets?.binding!=='ASSETS'||!wranglerConfig.assets?.run_worker_first?.includes('/api/*'))throw Error('Cloudflare API routing must run Worker first');
if(wranglerConfig.assets?.html_handling!=='auto-trailing-slash')
  throw Error('Cloudflare must use native HTML directory routing');
if(wranglerConfig.assets?.not_found_handling==='single-page-application')
  throw Error('SPA fallback must not replace distinct role pages');
if(wranglerConfig.assets?.run_worker_first?.some(path=>path!=='/api/*'))
  throw Error('Role HTML must be served by Cloudflare assets directly, not Worker rewrite routes');
const workerSource=fs.readFileSync('cloudflare/worker.js','utf8');
if(workerSource.includes("pathname+'index.html'")||workerSource.includes("pathname+'/'"))
  throw Error('Worker must not redirect or rewrite role URLs to index.html');


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

for(const file of ['assets/legacy-app.js','assets/chapter-search.js','assets/chapters.js','assets/ai-format.js','assets/landing.js','assets/community.js','src/main.js','vite.config.js','api/ai.js','cloudflare/worker.js']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw Error(file+' has a syntax error:\\n'+result.stderr);
}

requireText(html,'<html lang="ar" dir="rtl">','Arabic RTL interface');
requireText(html,'<script type="module" src="/src/main.js"></script>','Vite entrypoint');
requireText(html,'href="/assets/app.css"','CSS independently loaded');
requireText(html,'href="/assets/chapters.css"','Chapter CSS independently loaded');
requireText(studentHtml,'id="chapterBreadcrumbs"','Nested navigation breadcrumb');
requireText(studentHtml,'id="chapterContext"','Lesson detail area');
for(const id of ['page-home','page-ai','page-files','page-chapters','approvedResourceGrid','aiOutput'])
  requireText(studentHtml,'id="'+id+'"','student-only interface');
for(const id of ['page-collaborate','collaboratorApplyForm','collaboratorStatusPanel','collabBranch','collabResourceBranch','contributorMetrics'])
  requireText(contributorHtml,'id="'+id+'"','contributor-only interface');
for(const id of ['page-admin','adminList','adminMetrics','adminSearch','adminReviewFilter'])
  requireText(adminHtml,'id="'+id+'"','admin-only interface');
for(const [doc,role] of [[html,'landing'],[loginHtml,'login'],[studentHtml,'student'],[contributorHtml,'contributor'],[adminHtml,'admin']]){
  requireText(doc,'data-portal="'+role+'"','separate role document');
  requireText(doc,'<script type="module" src="/src/main.js"></script>','shared bootstrap script');
}
for(const [role,doc,prohibited] of [
  ['landing',html,['id="loginGate"','id="page-home"','id="page-admin"','id="page-collaborate"']],
  ['login',loginHtml,['id="publicLanding"','id="page-home"','id="page-admin"','id="page-collaborate"']],
  ['student',studentHtml,['id="page-admin"','id="page-collaborate"']],
  ['contributor',contributorHtml,['id="page-admin"','id="page-home"','id="page-ai"']],
  ['admin',adminHtml,['id="page-home"','id="page-collaborate"','id="page-ai"']]
])for(const marker of prohibited)if(doc.includes(marker))throw Error('Mixed page code in '+role+': '+marker);
requireText(html,'href="/assets/portals.css"','portal stylesheet');
requireText(adminHtml,'data-admin-tab="ai"','admin diagnostic tab');
for(const value of ['async function inspectOwnerAI()','async function testOwnerAI()','agent:\'smart_tutor\'','Authorization:\'Bearer \'+token'])requireText(community,value,'admin-only AI test flow');
for(const marker of ['window.BAC_PORTAL_ROLE','sidebarBranches','sidebarStudyStats',"if(id==='admin')window.renderAdmin"])requireText(app,marker,'role-aware app navigation');

if([html,studentHtml,contributorHtml,adminHtml].some(doc=>/id="(?:page-flashcards|lpDemoFlashcard|flashcards-preview)"/.test(doc)))throw Error('Removed flashcard UI was reintroduced');
const landingCSS=fs.readFileSync('assets/landing.css','utf8');
requireText(landingCSS,'body.public-mode:not(.authenticated):not(.auth-modal-open){overflow-y:auto!important','Public landing must remain vertically scrollable');
for(const id of ['publicLanding','lpHeroTitle'])requireText(html,'id="'+id+'"','public landing UI');
for(const id of ['signupKindStudent','signupKindCollaborator','signupNameInput','loginGate','loginEmailInput','signupEmailInput','passwordRecoveryPanel','authSetupNotice'])
  requireText(loginHtml,'id="'+id+'"','standalone auth interface');
requireText(loginHtml,'href="/assets/auth-page.css"','auth stylesheet');
requireText(loginHtml,'auth-submit','auth CTA style');
if(html.includes('id="loginEmailInput"'))throw Error('Login form leaked into public landing HTML');
for(const htmlFile of ['login/index.html','student/index.html','contributor/index.html','admin/index.html'])
  requireText(config,htmlFile,'Vite multi-page build input');
for(const css of ['/assets/landing.css','/assets/community.css'])requireText(html,'href="'+css+'"','new independent CSS');
for(const asset of ['assets/landing.js','assets/community.js','assets/ai-format.js'])requireText(config,asset,'Vite runtime packaging');
if(/<script>\\s*[\\s\\S]{100}/.test(html))throw Error('Application logic should not be inline in the HTML');
requireText(config,'resources.json','resource manifest build packaging');
requireText(config,'assets/legacy-app.js','legacy runtime build packaging');
requireText(main,"from '@supabase/supabase-js'",'bundled Supabase dependency');
requireText(main,'window.supabase={createClient}','legacy Supabase adapter');
const bootPaths=['/auth-config.js','/assets/chapter-search.js','/assets/legacy-app.js','/assets/chapters.js','/assets/ai-format.js','/assets/landing.js','/assets/community.js'];
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
for(const id of ['id="passwordRecoveryPanel"','id="loginGate"'])requireText(loginHtml,id,'dedicated authentication interface');
for(const id of ['id="page-chapters"','id="chapterResults"'])requireText(studentHtml,id,'student learning interface');
requireText(app,'userStorageKey(studentAuthUser.id)','private student storage key');
if(app.includes('localStorage.getItem(CONFIG.storageKey)'))throw Error('Unscoped progress cache is not allowed');
if(app.includes('window.prompt('))throw Error('Blocking browser prompts are not allowed in authentication');
if(/sessionGeminiKey|x-goog-api-key|generativelanguage\\.googleapis\\.com|CONFIG\\.aiApiKey/.test(app))throw Error('Provider credentials or direct AI calls are not allowed in browser runtime');
requireText(app,'callProxyAI(agentId,ctx)','authenticated AI proxy call');
for(const marker of ["document.body.dataset.portal!=='student'","if(document.body.dataset.portal!==expected)"])
  requireText(app,marker,'per-route DOM isolation');
for(const marker of ['portal-authorized','window.location.replace','currentPortal!==expected'])
  requireText(community,marker,'database-backed portal routing');

requireText(app,'السؤال الذي يجب الإجابة عنه أولاً','AI should prioritize precise user questions');
requireText(app,'if(window.renderAIAnswer)window.renderAIAnswer(out,ans);','model output formatted safely');
requireText(studentHtml,'class="result-box ai-answer"','readable AI result area');
const worker=fs.readFileSync('cloudflare/worker.js','utf8');
for(const part of ['QUESTION EXACTE',"reasoning_effort:'low'",'max_completion_tokens:4096'])
  requireText(worker,part,'question-first Deploy backend');

requireText(app,'signup_intent:signupIntent,...contributorInfo','signup metadata is onboarding only');
requireText(app,'emailRedirectTo:location.origin+location.pathname','confirmation links must return to current origin');
for(const marker of ["location.assign('/login/?'","document.body.dataset.portal==='login'","function openAuthModal(tab="])
  requireText(app,marker,'login route navigation');
requireText(main,"location.replace('/login/'+location.search+location.hash)",'legacy recovery redirection');
const authStyle=fs.readFileSync('assets/auth-page.css','utf8');
for(const marker of ['[data-portal="login"]','.auth-visual','.login-field:focus-within','@media(max-width:760px)'])
  requireText(authStyle,marker,'premium login styling');
requireText(config,'login/index.html','Vite must build independent login page');
if(wranglerConfig.assets.html_handling!=='auto-trailing-slash')
  throw Error('Cloudflare must serve login pages via native canonical HTML handling');

for(const marker of ["from('collaborator_applications')","from('collaborator_resources')","window.onCommunityAuthChanged=","from('platform_roles')","claim_owner_access","review_collaborator_application","review_collaborator_resource","admin_delete_contributor_resource","admin_update_curated_resource","admin_update_contributor_profile","resubmit_contributor_resource","resubmit_collaborator_application","openAdminEditor","loadApprovedResources","renderAdmin"])requireText(community,marker,'role-separated dashboard flow');
for(const marker of ['alter table public.flashcard_decks enable row level security','alter table public.flashcard_cards enable row level security','alter table public.collaborator_applications enable row level security','alter table public.collaborator_resources enable row level security','grant insert (user_id,display_name,organization,contribution_type,motivation)','grant insert (contributor_id,title,subject,description,resource_url)'])requireText(collaborationSchema,marker,'protected database schema');
if(/grant\s+update[^;]*\s+on\s+public\.collaborator_(applications|resources)\s+to\s+authenticated/i.test(collaborationSchema))throw Error('Collaborators must not be able to self-approve their status');

for(const marker of ['match(/^Bearer\\s+(.+)$/i)','/rest/v1/rpc/consume_ai_quota','email_confirmed_at','DEPLOY_API_KEY','DEPLOY_API_ENDPOINT','DEPLOY_MODEL_ID'])requireText(api,marker,'Deploy server-side security');
if(/GEMINI_API_KEY|generativelanguage\\.googleapis\\.com|gemini-3\\./.test(api))throw Error('Unexpected obsolete Gemini integration');

for(const file of ['scripts/check-chapter-search.mjs','scripts/check-chapter-navigation.mjs','scripts/check-ai-health.mjs','scripts/check-ai-render.mjs','scripts/check-cloudflare-worker.mjs','scripts/validate-resources.mjs']){
  const result=spawnSync(process.execPath,[file],{encoding:'utf8'});
  if(result.status!==0)throw Error(file+' failed:\\n'+(result.stderr||result.stdout));
  console.log((result.stdout||'').trim());
}
console.log('Bac-pedia source checks passed: Vite entry, modular scripts, auth guards, API, chapter search, resource catalog.');
