import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const src = 'D:\\7Z-Magic\\7Z-Magic Website';
const goldenDir = 'D:\\7Z-Magic-GOLDEN-EDITION-V1';

if (!fs.existsSync(goldenDir)) {
  fs.mkdirSync(goldenDir, { recursive: true });
}

const excludeDirs = [
  '.git',
  'node_modules',
  '_CLEAN_BASELINES',
  '_SAFE_BACKUPS',
  '7Z-Magic-Website_MASTER',
  '7Z-Magic-Website_ANALYTICS_BACKUP_20261003_185302',
  '7Z-Magic-Website_GOLDEN_BACKUP'
].map((d) => `"${d}"`).join(' ');

try {
  execSync(`robocopy "${src}" "${goldenDir}" /MIR /R:1 /W:1 /XD ${excludeDirs} /NFL /NDL /NJH /NJS`, {
    stdio: 'ignore'
  });
} catch (err) {
  if (err && typeof err.status === 'number' && err.status > 7) {
    throw err;
  }
}
console.log('[1/2 LOCAL GOLDEN SYNCED]:', new Date().toISOString(), '->', goldenDir);

// 2. دفع النسخة الذهبية مباشرة إلى فرع backup-golden-edition الرسمي على GitHub
try {
  execSync('git push origin HEAD:refs/heads/backup-golden-edition --force', {
    cwd: src,
    stdio: 'ignore'
  });
  console.log('[2/2 GITHUB GOLDEN SYNCED]: origin/backup-golden-edition');
} catch (err) {
  console.warn('[GITHUB GOLDEN SYNC NOTE]:', err.message);
}

// 3. تحديث مستودع Git المحلي داخل D:\7Z-Magic-GOLDEN-EDITION-V1 إن وُجد
if (fs.existsSync(path.join(goldenDir, '.git'))) {
  try {
    execSync('git add -A', { cwd: goldenDir, stdio: 'ignore' });
    const status = execSync('git status --porcelain', { cwd: goldenDir, encoding: 'utf8' }).trim();
    if (status) {
      execSync(`git commit -m "chore(golden-sync): auto-sync from main (${new Date().toISOString()})"`, {
        cwd: goldenDir,
        stdio: 'ignore'
      });
    }
    execSync('git push origin HEAD', { cwd: goldenDir, stdio: 'ignore' });
  } catch (_) {}
}
