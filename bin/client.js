import { createRequire } from 'module';
import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const { log, error: logError } = console;

const BACKEND_URL = 'https://threejs-ai-backend.harisudahmalam.workers.dev';

/** Extract a user-friendly message from an axios / network error */
function formatApiError(error, fallback = 'Unknown error') {
  if (error.response) {
    const data = error.response.data;
    const msg = data?.error || data?.message || data?.detail || JSON.stringify(data);
    return `${msg} (HTTP ${error.response.status})`;
  }
  if (error.request) {
    return 'No response from server. Check your network or the backend URL.';
  }
  return error.message || fallback;
}

// --- Argument Parser ---
function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

// --- Configuration Manager ---
class ConfigManager {
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
