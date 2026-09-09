import fs from 'fs';
import os from 'os';
import path from 'path';
import { logError, chalk } from './utils.js';

export class ConfigManager {
  constructor() {
    this.configPath = getConfigDir();
    this.configFile = path.join(this.configPath, 'config.json');
    this.ensureConfigExists();
  }

  ensureConfigExists() {
    if (!fs.existsSync(this.configPath)) {
      fs.mkdirSync(this.configPath, { recursive: true });
    }
    if (!fs.existsSync(this.configFile)) {
      this.write({});
    }
  }

  read() {
    try {
      const raw = fs.readFileSync(this.configFile, 'utf-8');
      return JSON.parse(raw || '{}');
    } catch (err) {
      logError(chalk.yellow('⚠️  Config corrupted or unreadable:'), err);
      this.write({});
      return {};
    }
  }

  write(data) {
    try {
      this.ensureConfigExists();

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'threejs-ai-cli-'));
      const tmpFile = path.join(tmpDir, 'config.tmp');

      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), {
        encoding: 'utf8',
        mode: 0o600
      });

      fs.renameSync(tmpFile, this.configFile);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (error) {
      logError(chalk.red('❌ Failed to write config:'), error);
    }
  }

  set(key, value) {
    const config = this.read();
    config[key] = value;
    this.write(config);
  }

  get(key) {
    const config = this.read();
    return config[key];
  }
}

function getConfigDir() {
  const home = os.homedir();

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'threejs-ai-cli');
  }

  const xdg = process.env.XDG_CONFIG_HOME;
  return path.join(xdg || path.join(home, '.config'), 'threejs-ai-cli');
}
