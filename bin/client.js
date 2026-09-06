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

// --- API Client ---
class ThreeJSAPI {
  constructor(apiKey, userId, baseURL = BACKEND_URL) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.userId = userId;

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 120_000,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    this.authClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30_000,
      headers: {
        'Authorization': `Bearer ${this.userId}`,
        'Content-Type': 'application/json'
      }
    });
  }

  static async register(email, username) {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, { email, username }, { timeout: 30_000 });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Registration failed:'), formatApiError(error));
      return null;
    }
  }

  static async login(username, key) {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, { username, key }, { timeout: 30_000 });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Login failed:'), formatApiError(error));
      return null;
    }
  }

  async generateProject(specs) {
    try {
      const response = await this.apiClient.post('/api/generate-project', specs);
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Error generating project:'), formatApiError(error));
      return null;
    }
  }

  async createApiKey(name) {
    try {
      const response = await this.authClient.post('/api/api-keys', { name });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Error creating API key:'), formatApiError(error, 'Ensure you are registered and logged in.'));
      return null;
    }
  }

  static async saveProjectFiles(files, projectName) {
    if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
      logError(chalk.red('❌ No project files received from the server.'));
      return false;
    }

    const safeName = (projectName || 'threejs-project')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const projectDir = path.join(process.cwd(), safeName);

    try {
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      for (const [filename, content] of Object.entries(files)) {
        if (typeof content !== 'string') {
          log(chalk.yellow(`   ⚠️  Skipping non-text file: ${filename}`));
          continue;
        }
        const filePath = path.join(projectDir, filename);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf8');
        log(chalk.green(`   📄 Created: ${filePath}`));
      }

      log(chalk.blue(`\n🎉 Project saved to: ${projectDir}`));
      log(chalk.yellow(`\n🚀 To get started, run:\n   cd ${safeName}\n   npm install\n   npm run dev`));
      return true;
    } catch (error) {
      logError(chalk.red('❌ Failed to write project files:'), error.message);
      return false;
    }
  }
}

// --- CLI Commands ---
const commands = {
  async login(args) {
    const opts = parseArgs(args);
    const { username, key } = opts;

    if (!username || !key) {
      logError(chalk.red('Usage: three login --username <username> --key <apiKey>'));
      return;
    }

    log(chalk.blue(`Logging in as ${username}...`));
    const data = await ThreeJSAPI.login(username, key);

    if (data && data.success) {
      const config = new ConfigManager();
      config.set('apiKey', data.apiKey);
      config.set('userId', data.user.id);
      config.set('userEmail', data.user.email);
      config.set('username', data.user.username);
      log(chalk.green('✅ Login successful!'));
      log(chalk.yellow(`Credentials for ${data.user.username} have been saved.`));
    }
  },

  async register(args) {
    const opts = parseArgs(args);
    const { email, username } = opts;
    if (!email || !username) {
      logError(chalk.red('Usage: three register --email <email> --username <username>'));
      return;
    }

    log(chalk.blue('Registering new user...'));
    const data = await ThreeJSAPI.register(email, username);

    if (data && data.success) {
      const config = new ConfigManager();
      config.set('apiKey', data.apiKey);
      config.set('userId', data.user.id);
      config.set('userEmail', data.user.email);
      config.set('username', data.user.username);
      log(chalk.green('✅ Registration successful!'));
      log(`   Welcome, ${username}!`);
      log(chalk.yellow('   Your new API key has been saved automatically.'));
    }
  },

  async generate(args) {
    const config = new ConfigManager();
    const apiKey = config.get('apiKey');
    const userId = config.get('userId');

    if (!apiKey) {
      logError(chalk.red('API Key not found. Please register or login first.'));
      return;
    }

    const specs = {
      projectType: args[0] || 'portfolio',
      complexity: args[1] || 'intermediate',
      style: args[2] || 'minimalist',
      description: args.slice(3).join(' ') || 'A professional Three.js portfolio website showing creative projects.'
    };

    log(chalk.blue('Generating Three.js project with AI...'));
    log(chalk.dim('   Type:'), chalk.cyan(specs.projectType));
    log(chalk.dim('   Complexity:'), chalk.cyan(specs.complexity));
    log(chalk.dim('   Style:'), chalk.cyan(specs.style));
    log(chalk.dim('   Description:'), chalk.cyan(specs.description));

    const api = new ThreeJSAPI(apiKey, userId);
    const data = await api.generateProject(specs);

    if (data && data.success) {
      const { project, usage } = data;
      log(chalk.green('\n✅ Project generated successfully!'));
      log(`   📁 Project ID: ${project.id}`);
      log(`   ⚡ Gen Time: ${project.generationTime}ms`);
      log(`   🤖 Tokens used: ${usage.totalTokens} (Input: ${usage.inputTokens}, Output: ${usage.outputTokens})`);
      log(`   🏠 Remaining tokens: ${usage.remainingTokens}`);

      await ThreeJSAPI.saveProjectFiles(project.files, project.name);
    }
  },

  async createKey(args) {
    const config = new ConfigManager();
    const apiKey = config.get('apiKey');
    const userId = config.get('userId');

    if (!userId) {
      logError(chalk.red('User not found. Please register or login first.'));
      return;
    }

    const name = args[0] || 'New CLI Key';
    log(chalk.blue(`Creating new API key named "${name}"...`));

    const api = new ThreeJSAPI(apiKey, userId);
    const data = await api.createApiKey(name);

    if (data && data.success) {
      log(chalk.green('✅ New API Key created successfully!'));
      log(chalk.yellow(`   ${data.apiKey}`));
    }
  },

  whoami() {
    const config = new ConfigManager();
    const username = config.get('username');
    const email = config.get('userEmail');
    const apiKey = config.get('apiKey');

    if (!username) {
      log(chalk.yellow('Not logged in. Use `three register` or `three login` to get started.'));
      return;
    }

    log(chalk.blue('Current User:'));
    log(`   Username: ${username}`);
    log(`   Email: ${email}`);
    log(chalk.yellow(`   API Key: ${apiKey}`));
    log(chalk.magenta('   ☝️ Copy and keep this API Key for logging in on other devices or at a later time.'));
  },

  async tokens() {
    const config = new ConfigManager();
    const apiKey = config.get('apiKey');
    const userId = config.get('userId');

    if (!apiKey || !userId) {
      logError(chalk.red('API Key not found. Please register or login first.'));
      return;
    }

    log(chalk.blue('Fetching token balance...'));

    try {
      const response = await axios.get(`${BACKEND_URL}/api/tokens`, {
        timeout: 15_000,
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        log(chalk.green(`\n✅ Your token balance: ${response.data.tokens}`));
      } else {
        logError(chalk.red('❌ Failed to get token balance:'), response.data.error || 'Unknown error');
      }
    } catch (error) {
      logError(chalk.red('❌ Error fetching token balance:'), formatApiError(error));
    }
  },

  async buy(args) {
    const config = new ConfigManager();
    const apiKey = config.get('apiKey');
    const userId = config.get('userId');

    if (!apiKey || !userId) {
      logError(chalk.red('API Key not found. Please register or login first.'));
      return;
    }

    const packageNames = ['basic', 'standard', 'premium', 'pro'];
    let amount, packageType;

    if (packageNames.includes(args[0])) {
      packageType = args[0];

      try {
        const packageResponse = await axios.get(`${BACKEND_URL}/api/packages`, { timeout: 15_000 });
        const packages = packageResponse.data?.packages || [];
        const selectedPackage = packages.find(pkg => pkg.id === packageType);

        if (!selectedPackage) {
          logError(chalk.red(`Package "${packageType}" not found.`));
          log(chalk.yellow('Available packages: basic, standard, premium, pro'));
          return;
        }

        amount = selectedPackage.price;
      } catch (error) {
        logError(chalk.red('❌ Error fetching package information:'), formatApiError(error));
        return;
      }
    } else {
      amount = parseFloat(args[0]);
      packageType = args[1] || 'standard';

      if (!amount || amount <= 0 || Number.isNaN(amount)) {
        logError(chalk.red('Usage: three buy <amount> [package-type] or three buy [package-name]'));
        log(chalk.yellow('Examples:'));
        log(chalk.yellow('  three buy 10 standard'));
        log(chalk.yellow('  three buy premium'));
        log(chalk.yellow('  Available packages: basic, standard, premium, pro'));
        return;
      }
    }

    log(chalk.blue(`Creating payment order for $${amount} (${packageType} package)...`));

    try {
      const response = await axios.post(`${BACKEND_URL}/api/payments/create-invoice`, {
        amount,
        packageType
      }, {
        timeout: 30_000,
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        log(chalk.green(`\n✅ Payment order created successfully!`));
        log(chalk.yellow(`Order ID: ${response.data.orderId}`));
        log(chalk.yellow(`Amount: $${response.data.amount}`));
        log(chalk.yellow(`Package: ${response.data.packageType}`));
        log(chalk.blue(`\nPlease complete your payment at:`));
        log(chalk.cyan(response.data.paymentUrl));
        log(chalk.dim(`(Open the link in your browser)`));
      } else {
        logError(chalk.red('❌ Failed to create payment order:'), response.data.error || 'Unknown error');
      }
    } catch (error) {
      logError(chalk.red('❌ Error creating payment order:'), formatApiError(error));
    }
  },

  async package() {
    const pricingUrl = 'https://threejs-cli-ai.pages.dev';
    log(chalk.blue('Opening package and pricing page...'));
    log(chalk.yellow(`Please visit: ${pricingUrl}`));
    log(chalk.dim('(You can purchase tokens from the frontend)'));

    try {
      const { exec } = await import('child_process');
      const platform = os.platform();
      let command;

      switch (platform) {
        case 'darwin':
          command = `open "${pricingUrl}"`;
          break;
        case 'win32':
          command = `start "" "${pricingUrl}"`;
          break;
        default:
          command = `xdg-open "${pricingUrl}"`;
      }

      exec(command, (error) => {
        if (error) {
          // Browser open failed — URL already printed above
        }
      });
    } catch {
      // Ignore — user can open the URL manually
    }
  },

  help() {
    log(chalk.cyan(`
  Three.js AI CLI Generator
  `));
    log(chalk.yellow('Usage:'));
    log('  three <command> [options]');
    log('');
    log(chalk.yellow('Commands:'));
    log(chalk.green('  login'), '     --username <username> --key <apiKey>');
    log(chalk.dim('             Log in and save credentials.'));
    log('');
    log(chalk.green('  register'), '  --email <email> --username <username>');
    log(chalk.dim('             Register a new user.'));
    log('');
    log(chalk.green('  generate'), '  [type] [complexity] [style] [description]');
    log(chalk.dim('             Generate a new project.'));
    log(chalk.yellowBright('             (e.g., `three generate portfolio intermediate minimalist "Personal portfolio with 3D elements"`).'));
    log('');
    log(chalk.green('  create-key'), '[name]');
    log(chalk.dim('             Create an additional API key.'));
    log('');
    log(chalk.green('  tokens'), '    Display the current token balance.');
    log('');
    log(chalk.green('  buy'), '       Purchase additional tokens. Usage: buy <amount> [package-type] or buy [package-name]');
    log(chalk.dim('             Examples: three buy 10 standard, three buy premium'));
    log('');
    log(chalk.green('  package'), '   View available packages and pricing.');
    log(chalk.dim('             Opens the pricing page in your browser.'));
    log('');
    log(chalk.green('  whoami'), '     Display the current logged-in user.');
    log('');
    log(chalk.green('  help'), '       Show this help message.');
    log('');
  }
};

// --- Main Execution ---
async function main() {
  try {
    const [,, command, ...args] = process.argv;

    if (command === '-v' || command === '--version' || command === 'version') {
      log(pkg.version);
      return;
    }

    // Normalize hyphenated commands (e.g. create-key -> createKey)
    const normalized = command
      ? command.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      : null;

    const cmd = (normalized && commands[normalized]) || commands.help;
    await cmd(args);
  } catch (error) {
    logError(chalk.red('❌ Unexpected error:'), error.message || error);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

main();
