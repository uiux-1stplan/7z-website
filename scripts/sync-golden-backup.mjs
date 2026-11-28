const { execSync } = require('child_process');
const fs = require('fs');

const src = 'D:\\7Z-Magic\\7Z-Magic Website';
const dst = 'D:\\\\7Z-Magic\\\\7Z-Magic-Website_GOLDEN_BACKUP';

if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });

const excludeDirs = [
  '.git', 'node_modules', '_CLEAN_BASELINES', '_SAFE_BACKUPS',
  '7Z-Magic-Website_MASTER', '7Z-Magic-Website_ANALYTICS_BACKUP_20261003_185302',
  '7Z-Magic-Website_GOLDEN_BACKUP'
].map(d => '"' + d + '"').join(' ');

try {
  execSync(\obocopy "\" "\" /MIR /R:1 /W:1 /XD \ /NFL /NDL /NJH /NJS\, { stdio: 'ignore' });
} catch (e) {
  // Robocopy returns exit codes 0-7 for successful copies
  if (e.status > 7) throw e;
}
console.log('[GOLDEN BACKUP SYNCED]:', new Date().toISOString(), '->', dst);
