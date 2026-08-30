import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function patchSwcNested() {
  const p = path.join(root, 'node_modules/vite-plugin-top-level-await/node_modules');
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log('[postinstall] removed nested @swc/core for vite-plugin-top-level-await');
  }
}

function patchEslintReact() {
  const v = path.join(root, 'node_modules/eslint-plugin-react/lib/util/version.js');
  if (fs.existsSync(v)) {
    let t = fs.readFileSync(v, 'utf8');
    if (t.includes('contextOrFilename.getFilename()')) {
      t = t.replace(
        'contextOrFilename.getFilename()',
        "(typeof contextOrFilename.getFilename === 'function' ? contextOrFilename.getFilename() : (contextOrFilename.filename || contextOrFilename.physicalFilename))",
      );
      fs.writeFileSync(v, t, 'utf8');
      console.log('[postinstall] patched eslint-plugin-react version.js');
    }
  }
  const j = path.join(root, 'node_modules/eslint-plugin-react/lib/rules/jsx-filename-extension.js');
  if (fs.existsSync(j)) {
    let t = fs.readFileSync(j, 'utf8');
    if (t.includes('context.getFilename()')) {
      t = t.replace(
        'context.getFilename()',
        "(typeof context.getFilename === 'function' ? context.getFilename() : (context.filename || context.physicalFilename))",
      );
      fs.writeFileSync(j, t, 'utf8');
      console.log('[postinstall] patched eslint-plugin-react jsx-filename-extension.js');
    }
  }
}

patchSwcNested();
patchEslintReact();
