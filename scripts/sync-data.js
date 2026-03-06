#!/usr/bin/env node
// Regenerate data/*.js modules from data/*.json source files
// Zero dependencies — uses only Node.js built-ins
// Usage: node scripts/sync-data.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
}

function write(file, content) {
  fs.writeFileSync(path.join(dataDir, file), content);
  console.log(`  wrote ${file} (${content.length} bytes)`);
}

console.log('Syncing JSON → JS data modules...\n');

// Monsters — strip description field (not used at runtime, saves ~9KB)
const monsters = read('monsters.json').map(m => {
  const { description, ...rest } = m;
  return rest;
});
write('monsters.js',
  '// Monster data — inlined from monsters.json (descriptions stripped for size)\n' +
  '// To regenerate: node scripts/sync-data.js\n' +
  'export const MONSTERS = ' + JSON.stringify(monsters, null, 2)
    .replace(/"(\w+)":/g, '$1:')  // unquote simple keys
    .replace(/"/g, "'")           // single quotes
  + ';\n'
);

// Moves
const moves = read('moves.json');
write('moves.js',
  '// Move data — inlined from moves.json\n' +
  '// To regenerate: node scripts/sync-data.js\n' +
  'export const MOVES = ' + JSON.stringify(moves, null, 2)
    .replace(/"(\w+)":/g, '$1:')
    .replace(/"/g, "'")
  + ';\n'
);

// Types
const types = read('types.json');
write('types.js',
  '// Type data — inlined from types.json\n' +
  '// To regenerate: node scripts/sync-data.js\n' +
  'export const TYPES = ' + JSON.stringify(types, null, 2)
    .replace(/"(\w+)":/g, '$1:')
    .replace(/"/g, "'")
  + ';\n'
);

// Map
const map = read('map.json');
write('mapData.js',
  '// Map data — inlined from map.json\n' +
  '// To regenerate: node scripts/sync-data.js\n' +
  'export const MAP_DATA = ' + JSON.stringify(map) + ';\n'
);

// Evolutions
const evolutions = read('evolutions.json');
write('evolutions.js',
  '// Evolution data — inlined from evolutions.json\n' +
  '// To regenerate: node scripts/sync-data.js\n' +
  'export const EVOLUTIONS = ' + JSON.stringify(evolutions, null, 2)
    .replace(/"(\w+)":/g, '$1:')
    .replace(/"/g, "'")
  + ';\n'
);

// Report
const jsonSize = ['monsters.json', 'moves.json', 'types.json', 'map.json', 'evolutions.json']
  .reduce((sum, f) => sum + fs.statSync(path.join(dataDir, f)).size, 0);
const jsSize = ['monsters.js', 'moves.js', 'types.js', 'mapData.js', 'evolutions.js']
  .reduce((sum, f) => sum + fs.statSync(path.join(dataDir, f)).size, 0);

console.log(`\nJSON source:  ${jsonSize} bytes`);
console.log(`JS modules:   ${jsSize} bytes (${jsSize < jsonSize ? '-' : '+'}${Math.abs(jsonSize - jsSize)} bytes, descriptions stripped)`);
console.log('Done!');
