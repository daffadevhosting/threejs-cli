import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import os from 'os';
import path from 'path';

import { ConfigManager } from '../bin/lib/config.js';
import { compareVersions, normalizeVersion } from '../bin/lib/utils.js';

describe('version helpers', () => {
  test('normalizeVersion strips leading v and suffixes', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('1.2.3-beta.1')).toBe('1.2.3');
  });

  test('compareVersions handles semver ordering', () => {
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
    expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });
});

describe('ConfigManager', () => {
  const originalXdg = process.env.XDG_CONFIG_HOME;

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
  });

  test('writes config data to the XDG config directory and preserves values', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'threejs-cli-config-'));
    process.env.XDG_CONFIG_HOME = tempDir;

    const config = new ConfigManager();
    config.set('apiKey', 'abc123');

    const configPath = path.join(tempDir, 'threejs-ai-cli', 'config.json');
    expect(existsSync(configPath)).toBe(true);
    expect(JSON.parse(readFileSync(configPath, 'utf8'))).toMatchObject({ apiKey: 'abc123' });

    rmSync(tempDir, { recursive: true, force: true });
  });
});
