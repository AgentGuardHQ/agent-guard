// Tests for claude-init CLI command
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { claudeInit } from '../../src/cli/commands/claude-init.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

describe('claudeInit', () => {
  it('creates fresh settings with hook on first install', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await claudeInit([]);

    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.claude'), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledTimes(1);

    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
    expect(written.hooks).toBeDefined();
    expect(written.hooks.PostToolUse).toHaveLength(1);
    expect(written.hooks.PostToolUse[0].matcher).toBe('Bash');
    expect(written.hooks.PostToolUse[0].hooks[0].type).toBe('command');
    expect(written.hooks.PostToolUse[0].hooks[0].command).toContain('claude-hook');
  });

  it('detects already-configured hook and warns', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'node /path/to/claude-hook.js' }],
            },
          ],
        },
      })
    );

    await claudeInit([]);

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Already configured')
    );
  });

  it('handles corrupt settings.json gracefully', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('not valid json{{{');

    await claudeInit([]);

    // Should still install the hook (with fresh config)
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Warning')
    );
  });

  it('uses global path with --global flag', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await claudeInit(['--global']);

    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('/mock-home/.claude'),
      { recursive: true }
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/mock-home/.claude/settings.json'),
      expect.any(String),
      'utf8'
    );
  });

  it('uses global path with -g alias', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await claudeInit(['-g']);

    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('/mock-home/.claude'),
      { recursive: true }
    );
  });

  it('removes hook with --remove flag', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'node /path/to/claude-hook.js' }],
            },
          ],
        },
      })
    );

    await claudeInit(['--remove']);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
    // hooks and PostToolUse should be cleaned up (empty)
    expect(written.hooks).toBeUndefined();
  });

  it('removes hook with --uninstall alias', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'node /path/to/claude-hook.js' }],
            },
          ],
        },
      })
    );

    await claudeInit(['--uninstall']);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
  });

  it('reports nothing to remove when no hook is present', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

    await claudeInit(['--remove']);

    expect(writeFileSync).not.toHaveBeenCalled();
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('No AgentGuard hook found')
    );
  });

  it('reports nothing to remove when no settings file exists', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await claudeInit(['--remove']);

    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('No settings file found')
    );
  });

  it('preserves other hooks when removing', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({
        hooks: {
          PostToolUse: [
            {
              matcher: 'Bash',
              hooks: [{ type: 'command', command: 'node /path/to/claude-hook.js' }],
            },
            {
              matcher: 'Write',
              hooks: [{ type: 'command', command: 'echo custom' }],
            },
          ],
          PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'echo pre' }] }],
        },
      })
    );

    await claudeInit(['--remove']);

    const written = JSON.parse(vi.mocked(writeFileSync).mock.calls[0][1] as string);
    // PostToolUse should retain the Write matcher
    expect(written.hooks.PostToolUse).toHaveLength(1);
    expect(written.hooks.PostToolUse[0].matcher).toBe('Write');
    // PreToolUse should be untouched
    expect(written.hooks.PreToolUse).toBeDefined();
  });
});
