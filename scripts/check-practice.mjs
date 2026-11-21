import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=text('student/index.html');
const nav=text('assets/legacy-app.js');
const boot=text('src/main.js');
const build=text('vite.config.js');
const practice=text('assets/practice.js');
for(const id of ['page-practice','practiceSubject','practiceMinutes','practiceClock','practiceStart','practiceStop','practiceHistory']){
  assert.match(page,new RegExp('id="'+id+'"'),'missing student interface: '+id);
}
assert.match(page,/<html lang="ar" dir="rtl">/);
assert.match(nav,/\['practice','fa-solid fa-hourglass-half'/);
assert.match(boot,/\/assets\/practice\.js/);
assert.match(build,/assets\/practice\.js/);
assert.match(practice,/minutes<5\|\|minutes>240/);
assert.match(practice,/localStorage\.setItem/);
assert.doesNotMatch(practice,/service_role|supabase\.from|auth\.admin/);
console.log('Timed practice structural regressions passed.');
