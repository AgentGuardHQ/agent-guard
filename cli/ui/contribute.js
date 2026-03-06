// Contribution prompts — nudge users to submit new BugMon
// when the matcher has low confidence or when browsing the BugDex.

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const DIM = `${ESC}2m`;
const FG_CYAN = `${ESC}36m`;

const ISSUE_URL = 'https://github.com/jpleva91/BugMon/issues/new?template=new-bugmon.yml';

export const LOW_CONFIDENCE_THRESHOLD = 0.3;
export const BUGDEX_CONTRIBUTION_MIN = 5;

/**
 * Render a contribution prompt after a low-confidence encounter.
 * Writes to process.stderr (matching the encounter output stream).
 */
export function renderContributionPrompt() {
  const sep = `${DIM}  ${'┈'.repeat(41)}${RESET}`;
  const lines = [
    '',
    sep,
    `${DIM}  This error didn't match a BugMon well.${RESET}`,
    `${DIM}  Know this bug? Submit a new BugMon:${RESET}`,
    `  ${FG_CYAN}${ISSUE_URL}${RESET}`,
    sep,
    '',
  ];
  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * Return formatted lines for a contribution nudge at the bottom of the BugDex.
 * @param {number} discoveredCount
 * @returns {string[]}
 */
export function renderBugDexContributionPrompt(discoveredCount) {
  if (discoveredCount < BUGDEX_CONTRIBUTION_MIN) return [];
  return [
    '',
    `${DIM}  Know a bug that's missing? Contribute a new BugMon:${RESET}`,
    `  ${FG_CYAN}${ISSUE_URL}${RESET}`,
  ];
}
