// Tests for claude-hook CLI command (PostToolUse handler)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claudeHook } from '../../src/cli/commands/claude-hook.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

function mockStdin(data: string) {
  const originalStdin = process.stdin;
  const mockStdinObj = {
    isTTY: false,
    setEncoding: vi.fn(),
    on: vi.fn((event: string, cb: (arg?: string) => void) => {
      if (event === 'data') cb(data);
      if (event === 'end') setTimeout(() => cb(), 0);
      return mockStdinObj;
    }),
  };
  Object.defineProperty(process, 'stdin', {
    value: mockStdinObj,
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true,
    });
  };
}

function mockTTYStdin() {
  const originalStdin = process.stdin;
  const mockStdinObj = {
    isTTY: true,
    setEncoding: vi.fn(),
    on: vi.fn(() => mockStdinObj),
  };
  Object.defineProperty(process, 'stdin', {
    value: mockStdinObj,
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true,
    });
  };
}

describe('claudeHook', () => {
  it('exits 0 for TTY stdin (no piped input)', async () => {
    const restore = mockTTYStdin();
    try {
      await claudeHook();
      expect(process.exit).toHaveBeenCalledWith(0);
    } finally {
      restore();
    }
  });

  it('exits 0 for non-Bash tool calls', async () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_output: {} });
    const restore = mockStdin(input);
    try {
      await claudeHook();
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(process.stdout.write).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('exits 0 silently for Bash with exit code 0', async () => {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_output: { exit_code: 0, stdout: 'ok', stderr: '' },
    });
    const restore = mockStdin(input);
    try {
      await claudeHook();
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(process.stdout.write).not.toHaveBeenCalledWith(
        expect.stringContaining('Error detected')
      );
    } finally {
      restore();
    }
  });

  it('prints error summary for Bash with non-zero exit and stderr', async () => {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_output: { exit_code: 1, stdout: '', stderr: 'Permission denied: /etc/hosts' },
    });
    const restore = mockStdin(input);
    try {
      await claudeHook();
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Error detected')
      );
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
    } finally {
      restore();
    }
  });

  it('exits 0 for invalid JSON input', async () => {
    const restore = mockStdin('not valid json!!!');
    try {
      await claudeHook();
      expect(process.exit).toHaveBeenCalledWith(0);
    } finally {
      restore();
    }
  });

  it('uses exitCode field as fallback', async () => {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_output: { exitCode: 2, stderr: 'command not found' },
    });
    const restore = mockStdin(input);
    try {
      await claudeHook();
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Error detected')
      );
    } finally {
      restore();
    }
  });

  it('does not print error when stderr is empty even with non-zero exit', async () => {
    const input = JSON.stringify({
      tool_name: 'Bash',
      tool_output: { exit_code: 1, stderr: '' },
    });
    const restore = mockStdin(input);
    try {
      await claudeHook();
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(process.stdout.write).not.toHaveBeenCalledWith(
        expect.stringContaining('Error detected')
      );
    } finally {
      restore();
    }
  });
});
