#!/usr/bin/env node
// Validates a BugMon submission from a GitHub issue body.
// Usage: node validate-submission.js <issue-body>
// Outputs JSON: { valid: boolean, errors: string[], bugmon: object | null }

const fs = require('fs');
const path = require('path');

const STAT_MIN = 1;
const STAT_MAX = 120;

function parseIssueBody(body) {
  // GitHub issue forms produce markdown with ### headers and values below them.
  const fields = {};
  const lines = body.split('\n');
  let currentField = null;
  let currentValue = [];

  for (const line of lines) {
    const headerMatch = line.match(/^### (.+)$/);
    if (headerMatch) {
      if (currentField) {
        fields[currentField] = currentValue.join('\n').trim();
      }
      currentField = headerMatch[1].trim();
      currentValue = [];
    } else if (currentField) {
      currentValue.push(line);
    }
  }
  if (currentField) {
    fields[currentField] = currentValue.join('\n').trim();
  }

  return fields;
}

function moveNameToId(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

function validate(issueBody) {
  const errors = [];
  const fields = parseIssueBody(issueBody);

  // Load game data
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const monsters = JSON.parse(fs.readFileSync(path.join(dataDir, 'monsters.json'), 'utf8'));
  const moves = JSON.parse(fs.readFileSync(path.join(dataDir, 'moves.json'), 'utf8'));
  const typesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'types.json'), 'utf8'));

  const validTypes = typesData.types;
  const validMoveIds = moves.map(m => m.id);
  const validMoveNames = moves.map(m => m.name);
  const existingNames = monsters.map(m => m.name.toLowerCase());

  // Validate name
  const name = (fields['Name'] || '').trim();
  if (!name) {
    errors.push('Name is required.');
  } else if (!/^[a-zA-Z0-9]+$/.test(name)) {
    errors.push('Name must contain only letters and numbers (no spaces or special characters).');
  } else if (existingNames.includes(name.toLowerCase())) {
    errors.push(`A BugMon named "${name}" already exists.`);
  }

  // Validate type
  const type = (fields['Type'] || '').trim().toLowerCase();
  if (!type) {
    errors.push('Type is required.');
  } else if (!validTypes.includes(type)) {
    errors.push(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}.`);
  }

  // Validate stats
  const stats = {};
  for (const statName of ['HP', 'Attack', 'Defense', 'Speed']) {
    const raw = (fields[statName] || '').trim();
    const val = parseInt(raw, 10);
    if (!raw || isNaN(val)) {
      errors.push(`${statName} must be a number.`);
    } else if (val < STAT_MIN || val > STAT_MAX) {
      errors.push(`${statName} must be between ${STAT_MIN} and ${STAT_MAX} (got ${val}).`);
    } else {
      stats[statName.toLowerCase()] = val;
    }
  }

  // Validate moves
  const move1Name = (fields['Move 1'] || '').trim();
  const move2Name = (fields['Move 2'] || '').trim();
  const move1Id = moveNameToId(move1Name);
  const move2Id = moveNameToId(move2Name);

  if (!move1Name) {
    errors.push('Move 1 is required.');
  } else if (!validMoveIds.includes(move1Id)) {
    errors.push(`Invalid Move 1 "${move1Name}". Must be one of: ${validMoveNames.join(', ')}.`);
  }

  if (!move2Name) {
    errors.push('Move 2 is required.');
  } else if (!validMoveIds.includes(move2Id)) {
    errors.push(`Invalid Move 2 "${move2Name}". Must be one of: ${validMoveNames.join(', ')}.`);
  }

  if (move1Id && move2Id && move1Id === move2Id) {
    errors.push('Move 1 and Move 2 must be different.');
  }

  // Validate color (optional)
  const color = (fields['Color (optional)'] || '').trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    errors.push(`Invalid color "${color}". Must be a hex color like #e74c3c.`);
  }

  // Validate description
  const description = (fields['Description'] || '').trim();
  if (!description) {
    errors.push('Description is required.');
  }

  // Build BugMon object if valid
  let bugmon = null;
  if (errors.length === 0) {
    const defaultColor = typesData.typeColors[type] || '#cccccc';
    bugmon = {
      name,
      type,
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      moves: [move1Id, move2Id],
      color: color || defaultColor,
      description,
    };
  }

  return { valid: errors.length === 0, errors, bugmon };
}

// Main
const issueBody = process.argv[2];
if (!issueBody) {
  console.error('Usage: node validate-submission.js <issue-body>');
  process.exit(1);
}

const result = validate(issueBody);
console.log(JSON.stringify(result));
process.exit(result.valid ? 0 : 1);
