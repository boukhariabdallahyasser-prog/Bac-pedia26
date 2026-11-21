import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const student=read('student/index.html'),contributor=read('contributor/index.html'),admin=read('admin/index.html');
const comm=read('assets/community.js'),worker=read('service-worker.js'),build=read('vite.config.js'),main=read('src/main.js');
const sql=read('supabase/migrations/20261121235000_bac2027_content_workflows.sql');
for(const id of ['page-pdf','studyPdfInput','studyPdfText','studyPdfExtract','studyPdfSummarize','studyPdfQuiz']){
 assert.ok(student.includes('id="'+id+'"'),'missing PDF control '+id);
}
for(const id of ['collabSaveDraft','collabDraftsGrid','collabResourceForm'])assert.ok(contributor.includes('id="'+id+'"'));
assert.match(admin,/data-admin-tab="reports"/);
for(const table of ['contributor_drafts','contributor_resource_versions','contributor_private_feedback','resource_reviews','resource_pdf_attachments','resource_verifications']){
 assert.match(sql,new RegExp('create table if not exists public\\.'+table));
}
assert.match(sql,/security_invoker=true/);
assert.match(sql,/enable row level security/);
assert.doesNotMatch(sql,/drop table\s|truncate\s|delete from public\./i);
assert.match(sql,/public=false|false,15728640/);
assert.match(comm,/resource_verifications/);
assert.match(comm,/resource_reviews/);
assert.match(comm,/createSignedUrl/);
assert.match(comm,/saveDraft/);
assert.match(comm,/sendPrivateFeedback/);
assert.match(comm,/adminTab==='reports'/);
assert.match(worker,/p\.startsWith\('\/admin\/'\)/);
assert.match(worker,/p\.startsWith\('\/contributor\/'\)/);
assert.match(worker,/p\.startsWith\('\/api\/'\)/);
assert.match(build,/service-worker\.js/);
assert.match(main,/pdf-tools\.js/);
assert.match(read('src/pdf-tools.js'),/pdfjs-dist/);
console.log('Content workflow, privacy, offline and PDF integration structural checks passed.');
