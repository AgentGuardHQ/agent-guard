#!/usr/bin/env node
// BugMon single-file builder — produces dist/bugmon.html
// Zero dependencies — uses only Node.js built-ins
// Usage: node scripts/build.js [--no-sprites]

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const noSprites = process.argv.includes('--no-sprites');

// --- Dependency graph (manually ordered, leaves first) ---
const MODULE_ORDER = [
  'data/monsters.js',
  'data/moves.js',
  'data/types.js',
  'data/mapData.js',
  'data/evolutions.js',
  'engine/events.js',
  'engine/state.js',
  'audio/sound.js',
  'engine/input.js',
  'sprites/sprites.js',
  'sprites/monsterGen.js',
  'sprites/tiles.js',
  'world/map.js',
  'world/player.js',
  'world/encounters.js',
  'engine/renderer.js',
  'engine/transition.js',
  'sync/save.js',
  'sync/client.js',
  'engine/title.js',
  'battle/damage.js',
  'battle/battle-core.js',
  'battle/battleEngine.js',
  'evolution/tracker.js',
  'evolution/evolution.js',
  'evolution/animation.js',
  'game.js',
];

console.log('Building BugMon single-file distribution...\n');

// --- Read and process all modules ---
function readModule(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.warn(`  warning: ${relPath} not found, skipping`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function stripImportsExports(code) {
  // Remove import lines (named imports, default imports, side-effect imports)
  code = code.replace(/^\s*import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^\s*import\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '');
  // Remove dynamic imports (await import(...))
  code = code.replace(/^.*await\s+import\s*\([^)]*\).*$/gm, '');
  // Convert "export function" / "export async function" → "function" / "async function"
  code = code.replace(/^export\s+async\s+function\s/gm, 'async function ');
  code = code.replace(/^export\s+function\s/gm, 'function ');
  // Convert "export class" → "class"
  code = code.replace(/^export\s+class\s/gm, 'class ');
  // Convert "export const/let/var" → "const/let/var"
  code = code.replace(/^export\s+(const|let|var)\s/gm, '$1 ');
  // Remove "export { ... };" lines
  code = code.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');
  // Remove "export default" lines
  code = code.replace(/^export\s+default\s/gm, '');
  return code;
}

function minifyJS(code) {
  // Strip single-line comments (preserve URLs and strings)
  code = code.replace(/(?<![:'"])\/\/(?!['"]).*$/gm, '');
  // Strip multi-line comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Collapse blank lines
  code = code.replace(/\n\s*\n/g, '\n');
  // Trim each line
  code = code.split('\n').map(l => l.trim()).filter(l => l).join('\n');
  // Semicolons before }
  code = code.replace(/;\n}/g, '}');
  // Collapse simple blocks to one line
  code = code.replace(/\{\n([^\n{]*)\n}/g, '{$1}');
  // Note: Can't remove spaces around operators safely without a proper parser
  // (would break inside string literals). Keep it simple.
  return code;
}

function minifyCSS(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  css = css.replace(/\s*([{}:;,>+~])\s*/g, '$1');
  css = css.replace(/;\}/g, '}');
  css = css.replace(/\s+/g, ' ');
  return css.trim();
}

// --- Sprite inlining (optional) ---
function inlineSprites() {
  if (noSprites) return '';

  const spriteDir = path.join(ROOT, 'sprites');
  const pngs = fs.readdirSync(spriteDir).filter(f => f.endsWith('.png'));

  if (pngs.length === 0) return '';

  let code = '\n// Inline sprite data URIs\n';
  code += '(function() {\n';
  code += '  const SPRITE_DATA = {\n';
  for (const png of pngs) {
    const name = png.replace('.png', '');
    const data = fs.readFileSync(path.join(spriteDir, png));
    const b64 = data.toString('base64');
    code += `    "${name}": "data:image/png;base64,${b64}",\n`;
  }
  code += '  };\n';
  code += '  const origPreload = preloadSprite;\n';
  code += '  preloadSprite = function(name) {\n';
  code += '    if (SPRITE_DATA[name]) {\n';
  code += '      return new Promise(resolve => {\n';
  code += '        const img = new Image();\n';
  code += '        img.onload = () => { spriteCache[name] = img; resolve(img); };\n';
  code += '        img.src = SPRITE_DATA[name];\n';
  code += '      });\n';
  code += '    }\n';
  code += '    return origPreload(name);\n';
  code += '  };\n';
  code += '})();\n';
  return code;
}

// --- Read index.html and extract parts ---
const html = readModule('index.html');

// Extract CSS from <style> tag
const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const css = cssMatch ? minifyCSS(cssMatch[1]) : '';

// Extract HTML body content (between <body> and first <script>)
const bodyMatch = html.match(/<body>([\s\S]*?)<script/);
const bodyHTML = bodyMatch ? bodyMatch[1].trim() : '';

// Extract inline script (touch controls + mute)
const inlineScriptMatch = html.match(/<script type="module">\s*([\s\S]*?)<\/script>/);
const inlineScript = inlineScriptMatch ? inlineScriptMatch[1] : '';

// --- Bundle all JS modules ---
let bundle = '(function() {\n"use strict";\n\n';

const declaredNames = new Set();

for (const mod of MODULE_ORDER) {
  const raw = readModule(mod);
  if (!raw) continue;
  let stripped = stripImportsExports(raw);
  // Deduplicate top-level const/let declarations across modules
  stripped = stripped.replace(/^(const|let)\s+(\w+)\s*(=|;|,)/gm, (match, kw, name, sep) => {
    if (declaredNames.has(name)) {
      return `${name} ${sep === '=' ? '=' : sep}`;
    }
    declaredNames.add(name);
    return match;
  });
  bundle += `// --- ${mod} ---\n${stripped}\n\n`;
}

// Add inline script (touch controls), stripping its imports
bundle += '\n// --- Touch controls & mute ---\n';
bundle += stripImportsExports(inlineScript);

// Minify JS (before adding sprite data which contains base64)
let minBundle = minifyJS(bundle);

// Add sprite inlining after minification (base64 data is not minify-safe)
minBundle += inlineSprites();

minBundle += '\n})();\n';

// --- Assemble final HTML ---
const output = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">
<title>BugMon</title>
<style>${css}</style>
</head>
<body>
${bodyHTML}
<script>${minBundle}</script>
</body>
</html>`;

// --- Write output ---
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);
const outPath = path.join(DIST, 'bugmon.html');
fs.writeFileSync(outPath, output);

// --- Size report ---
const rawSize = output.length;
const gzipped = zlib.gzipSync(output);
const gzSize = gzipped.length;

// Calculate dev size (all source files)
let devSize = 0;
const devFiles = [];
function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'scripts' || entry.name === 'Documentation') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (/\.(js|html|json|png)$/.test(entry.name)) {
      const size = fs.statSync(full).size;
      devSize += size;
      devFiles.push({ name: path.relative(ROOT, full), size });
    }
  }
}
walkDir(ROOT);

console.log('=== BugMon Build Report ===\n');
console.log(`Dev files:       ${devFiles.length} files, ${(devSize / 1024).toFixed(1)} KB`);
console.log(`Single file:     ${(rawSize / 1024).toFixed(1)} KB (${outPath})`);
console.log(`Gzipped:         ${(gzSize / 1024).toFixed(1)} KB`);
console.log(`Compression:     ${((1 - rawSize / devSize) * 100).toFixed(0)}% reduction from dev`);
console.log(`Gzip ratio:      ${((1 - gzSize / rawSize) * 100).toFixed(0)}% further reduction`);
console.log(`\nHTTP requests:   1 (down from ${devFiles.length})`);

if (noSprites) {
  console.log('\nBuilt without sprites (--no-sprites). Using procedural fallbacks.');
}

console.log('\nDone! Open dist/bugmon.html in any browser.');
