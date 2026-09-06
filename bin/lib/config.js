import fs from 'fs';
import os from 'os';
import path from 'path';
import { logError, chalk } from './utils.js';

export class ConfigManager {
  constructor() {
    this.configPath = path.join(os.homedir(), '.config', 'threejs-ai-cli');
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
      const configData = fs.readFileSync(this.configFile, 'utf-8');
      return JSON.parse(configData || '{}');
    } catch {
      // Corrupted or empty config — reset
      this.write({});
      return {};
    }
  }

  write(data) {
    try {
      this.ensureConfigExists();
      fs.writeFileSync(this.configFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      logError(chalk.red('❌ Failed to write config:'), error.message);
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
