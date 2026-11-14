import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve(process.cwd(), 'resources.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const idPattern = /^[A-Za-z0-9_-]{10,}$/;
const errors = [];
let folders = 0;
let files = 0;

function checkNode(node, expectedParent = null, trail = 'root') {
  if (!node || typeof node !== 'object') {
    errors.push(`${trail}: resource must be an object`);
    return;
  }
  const id = node.driveId || node.id;
  if (typeof id !== 'string' || !idPattern.test(id)) {
    errors.push(`${trail}: invalid Drive ID`);
    return;
  }
  if (expectedParent && node.parentId !== expectedParent) {
    errors.push(`${trail}: parentId does not match its containing folder`);
  }
  if (node.type === 'folder') folders++;
  else if (node.type === 'file' || node.type === 'shortcut') files++;
  else errors.push(`${trail}: unsupported resource type ${String(node.type)}`);

  let parsed;
  try { parsed = new URL(node.url); } catch { parsed = null; }
  if (!parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'drive.google.com') {
    errors.push(`${trail}: URL must be an HTTPS Google Drive URL`);
  } else {
    const pathMatches = parsed.pathname.includes(`/folders/${id}`) ||
      parsed.pathname.includes(`/file/d/${id}`);
    if (!pathMatches) errors.push(`${trail}: URL does not contain its Drive ID`);
  }

  for (const [index, child] of (node.categories || []).entries()) {
    checkNode(child, id, `${trail}.categories[${index}]`);
  }
  for (const [index, child] of (node.items || []).entries()) {
    checkNode(child, id, `${trail}.items[${index}]`);
  }
}

if (manifest.schemaVersion !== 1) errors.push('Unsupported schemaVersion');
if (!manifest.rootFolder || !idPattern.test(manifest.rootFolder.id || '')) {
  errors.push('Missing or invalid root folder ID');
}
for (const [key, subject] of Object.entries(manifest.subjects || {})) {
  checkNode(subject, null, `subjects.${key}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Resource manifest valid: ${Object.keys(manifest.subjects).length} subject entries, ${folders} folders, ${files} files/shortcuts.`);
}
