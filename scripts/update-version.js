import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error('Version argument missing');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');

// Single source of truth: package.json
// UI reads from src/version.ts which imports package.json
execSync(`npm version ${version} --no-git-tag-version`, {
  cwd: root,
  stdio: 'inherit',
});

console.log(`Updated package.json and package-lock.json → ${version}`);
console.log('UI version auto-updates via src/version.ts');
