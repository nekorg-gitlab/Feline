import fs from 'fs';
import path from 'path';

const mappingPath = path.resolve('./src/app/locales/_mapping.json');
let mapping = {};
try {
  const raw = fs.readFileSync(mappingPath, 'utf-8');
  mapping = JSON.parse(raw);
} catch (e) {
  // fallback: try temp location
  try {
    const alt = path.resolve('C:/Users/Felipe/AppData/Local/Temp/opencode/mapping.json');
    mapping = JSON.parse(fs.readFileSync(alt, 'utf-8'));
  } catch {}
}

// Build reverse map is already eng->key, we use directly
const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function i18nAutoTranslate() {
  return {
    name: 'vite-i18n-auto-translate',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/')) return null;
      if (!/\.(tsx|ts|jsx|js)$/.test(id)) return null;
      if (id.includes('/locales/')) return null;
      if (code.includes('useTranslation') && code.includes("t('Common.")) {
        // already has some translations, but still may have more strings
        // continue to transform remaining
      }
      let newCode = code;
      let changed = false;
      let needsImport = false;
      let needsHook = false;

      for (const eng of sortedKeys) {
        const key = mapping[eng];
        if (!key) continue;
        if (newCode.includes(`t('${key}')`) || newCode.includes(`t("${key}")`)) continue;
        if (!newCode.includes(eng)) continue;

        const esc = escapeRegExp(eng);
        // Text nodes: <Text...>eng</Text>
        const textRe = new RegExp(`(<Text[^>]*>)\\s*${esc}\\s*(</Text>)`, 'g');
        if (textRe.test(newCode)) {
          newCode = newCode.replace(textRe, `$1{t('${key}')}$2`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        // title="eng"
        const titleRe = new RegExp(`title="${esc}"`, 'g');
        if (titleRe.test(newCode)) {
          newCode = newCode.replace(titleRe, `title={t('${key}')}`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        const descRe = new RegExp(`description="${esc}"`, 'g');
        if (descRe.test(newCode)) {
          newCode = newCode.replace(descRe, `description={t('${key}')}`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        const placeholderRe = new RegExp(`placeholder="${esc}"`, 'g');
        if (placeholderRe.test(newCode)) {
          newCode = newCode.replace(placeholderRe, `placeholder={t('${key}')}`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        const ariaRe = new RegExp(`aria-label="${esc}"`, 'g');
        if (ariaRe.test(newCode)) {
          newCode = newCode.replace(ariaRe, `aria-label={t('${key}')}`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        // JS object: name: 'eng'  (single quotes)
        const jsSingleRe = new RegExp(`([a-zA-Z_][a-zA-Z0-9_]*:\\s*)'${esc}'`, 'g');
        if (jsSingleRe.test(newCode)) {
          newCode = newCode.replace(jsSingleRe, `$1t('${key}')`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        const jsDoubleRe = new RegExp(`([a-zA-Z_][a-zA-Z0-9_]*:\\s*)"${esc}"`, 'g');
        if (jsDoubleRe.test(newCode)) {
          newCode = newCode.replace(jsDoubleRe, `$1t('${key}')`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
        // Generic JSX text: >eng<
        const genericRe = new RegExp(`>\\s*${esc}\\s*<`, 'g');
        if (genericRe.test(newCode)) {
          newCode = newCode.replace(genericRe, `>{t('${key}')}<`);
          changed = true;
          needsImport = true;
          needsHook = true;
          continue;
        }
      }

      if (!changed) return null;

      // Add import if needed
      if (needsImport && !newCode.includes('useTranslation')) {
        // Find end of first import statement (handles multi-line)
        const importMatch = newCode.match(/import[^;]*from\s+['"][^'"]+['"]\s*;?/);
        if (importMatch) {
          const pos = importMatch.index + importMatch[0].length;
          // Find the newline after this import
          const nextNewline = newCode.indexOf('\n', pos);
          const insertPos = nextNewline !== -1 ? nextNewline + 1 : pos;
          newCode =
            newCode.slice(0, insertPos) +
            `import { useTranslation } from 'react-i18next';\n` +
            newCode.slice(insertPos);
        } else {
          newCode = `import { useTranslation } from 'react-i18next';\n` + newCode;
        }
      }

      // Add hook to each component that now uses t but doesn't have it
      if (needsHook) {
        const compRe =
          /(export function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{|function\s+([A-Z]\w*)\s*\([^)]*\)\s*\{|export const\s+([A-Z]\w*)\s*=\s*forwardRef[^]*?=>\s*\{|export const\s+([A-Z]\w*)\s*=\s*\([^)]*\)\s*=>\s*\{|const\s+([A-Z]\w*)\s*=\s*forwardRef[^]*?=>\s*\{|const\s+([A-Z]\w*)\s*=\s*\([^)]*\)\s*=>\s*\{|const\s+([A-Z]\w*)\s*=\s*forwardRef[^]*?\(.*=>\s*\{)/g;
        let match;
        const toPatch = [];
        while ((match = compRe.exec(newCode)) !== null) {
          const name =
            match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8];
          if (!name || !/^[A-Z]/.test(name)) continue;
          const start = match.index + match[0].length - 1;
          const snippet = newCode.slice(start, start + 8000);
          if (snippet.includes("t('") && !snippet.slice(0, 800).includes('useTranslation')) {
            toPatch.push({ pos: start, name });
          }
        }
        // Also handle arrow functions inside forwardRef that were not captured: look for "=> {" with t nearby
        const arrowRe = /=>\s*\{/g;
        let arrowMatch;
        while ((arrowMatch = arrowRe.exec(newCode)) !== null) {
          const start = arrowMatch.index + arrowMatch[0].length - 1;
          const snippet = newCode.slice(start, start + 4000);
          if (snippet.includes("t('") && !snippet.slice(0, 600).includes('useTranslation')) {
            // Check if this arrow is inside a forwardRef component (look back for forwardRef)
            const before = newCode.slice(Math.max(0, start - 500), start);
            if (
              before.includes('forwardRef') ||
              before.includes('const ') ||
              before.includes('export const')
            ) {
              // Avoid duplicate if already in toPatch
              if (!toPatch.some((p) => Math.abs(p.pos - start) < 200)) {
                toPatch.push({ pos: start, name: 'arrow' });
              }
            }
          }
        }
        for (let i = toPatch.length - 1; i >= 0; i--) {
          const { pos } = toPatch[i];
          newCode =
            newCode.slice(0, pos + 1) +
            '\n  const { t } = useTranslation();' +
            newCode.slice(pos + 1);
        }
      }

      return { code: newCode, map: null };
    },
  };
}
