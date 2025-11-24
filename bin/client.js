import { createRequire } from 'module';
import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const { log, error: logError } = console;

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
    const configData = fs.readFileSync(this.configFile, 'utf-8');
    return JSON.parse(configData);
  }

  write(data) {
    fs.writeFileSync(this.configFile, JSON.stringify(data, null, 2));
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
  constructor(apiKey, userId, baseURL = 'https://threejs-ai-backend.workers.dev') {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.userId = userId;

    this.apiClient = axios.create({ // For API-key based requests
      baseURL: this.baseURL,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    this.authClient = axios.create({ // For user-token based requests
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.userId}`,
        'Content-Type': 'application/json'
      }
    });
  }

  static async register(email, username) {
    try {
      const response = await axios.post('https://threejs-ai-backend.harisudahmalam.workers.dev/api/auth/register', { email, username });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Registration failed:'), error.response?.data?.error || error.message);
      if (!error.response) {
        logError(chalk.red('💡 No response from server. Possible network issue or invalid URL configuration.'));
        logError(error); // Log the full error object
      }
      return null;
    }
  }
  
  static async login(username, key) {
    try {
      const response = await axios.post('https://threejs-ai-backend.harisudahmalam.workers.dev/api/auth/login', { username, key });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Login failed:'), error.response?.data?.error || error.message);
      if (!error.response) {
        logError(chalk.red('💡 No response from server. Possible network issue or invalid URL configuration.'));
        logError(error); // Log the full error object
      }
      return null;
    }
  }

  async generateProject(specs) {
    try {
      const response = await this.apiClient.post('/api/generate-project', specs);
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Error generating project:'), error.response?.data?.error || error.message);
      return null;
    }
  }

  async createApiKey(name) {
    try {
      const response = await this.authClient.post('/api/api-keys', { name });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Error creating API key:'), error.response?.data?.error || 'Ensure you are registered and logged in.');
      return null;
    }
  }

  static async saveProjectFiles(files, projectName) {
    const projectDir = `./../${projectName.replace(/\s+/g, '-')}`;
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(projectDir, filename);
      fs.writeFileSync(filePath, content);
      log(chalk.green(`   📄 Created: ${filePath}`));
    }
    log(chalk.blue(`\n🎉 Project saved to: ${projectDir}`));
    log(chalk.yellow(`\n🚀 To get started, run:\n   cd ${projectDir}\n   npm install\n   npm run dev`));
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

    if (!apiKey) {
      logError(chalk.red('API Key not found. Please register or login first.'));
      return;
    }

    log(chalk.blue('Fetching token balance...'));

    try {
      const response = await axios.get('https://threejs-ai-backend.harisudahmalam.workers.dev/api/tokens', {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        log(chalk.green(`\n✅ Your token balance: ${response.data.tokens}`));
      } else {
        logError(chalk.red('❌ Failed to get token balance:'), response.data.error);
      }
    } catch (error) {
      logError(chalk.red('❌ Error fetching token balance:'), error.response?.data?.error || error.message);
    }
  },

  async buy(args) {
    const config = new ConfigManager();
    const apiKey = config.get('apiKey');
    const userId = config.get('userId');

    if (!apiKey) {
      logError(chalk.red('API Key not found. Please register or login first.'));
      return;
    }

    // Check if the first argument is a package name
    const packageNames = ['basic', 'standard', 'premium', 'pro'];
    let amount, packageType;

    if (packageNames.includes(args[0])) {
      // User provided a package name
      packageType = args[0];

      // Fetch package information to get the price
      try {
        const packageResponse = await axios.get('https://threejs-ai-backend.harisudahmalam.workers.dev/api/packages');
        const selectedPackage = packageResponse.data.packages.find(pkg => pkg.id === packageType);

        if (!selectedPackage) {
          logError(chalk.red(`Package "${packageType}" not found.`));
          log(chalk.yellow('Available packages: basic, standard, premium, pro'));
          return;
        }

        amount = selectedPackage.price;
      } catch (error) {
        logError(chalk.red('❌ Error fetching package information:'), error.response?.data?.error || error.message);
        return;
      }
    } else {
      // User provided an amount
      amount = parseFloat(args[0]);
      packageType = args[1] || 'standard';

      if (!amount || amount <= 0) {
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
      const response = await axios.post('https://threejs-ai-backend.harisudahmalam.workers.dev/api/payments/create-invoice', {
        amount,
        packageType
      }, {
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
        logError(chalk.red('❌ Failed to create payment order:'), response.data.error);
      }
    } catch (error) {
      logError(chalk.red('❌ Error creating payment order:'), error.response?.data?.error || error.message);
    }
  },

  async package() {
    // Open the frontend to show packages and pricing
    log(chalk.blue('Opening package and pricing page...'));

    // Try to open local HTML file first
    try {
      const fsLocal = await import('fs');
      const pathLocal = await import('path');
      const osLocal = await import('os');

      const localPath = pathLocal.join(process.cwd(), 'pricing.html');
      if (fsLocal.existsSync(localPath)) {
        const url = `file://${localPath}`;
        log(chalk.yellow(`Opening local pricing page: ${url}`));

        // Try to open in default browser
        const os = osLocal.platform();
        let command;

        switch(os) {
          case 'darwin': // macOS
            command = `open ${url}`;
            break;
          case 'win32': // Windows
            command = `start ${url}`;
            break;
          default: // Linux and others
            command = `xdg-open ${url}`;
        }

        const { exec } = await import('child_process');
        exec(command, (error) => {
          if (error) {
            // If opening browser fails, just show the URL
            log(chalk.yellow(`Please visit: ${url} in your browser`));
          }
        });
      } else {
        // Fallback to online pricing page
        log(chalk.yellow('Please visit: https://threejs-ai-frontend.pages.dev/pricing'));
        log(chalk.dim('(This is the default frontend, you can customize it based on your deployment)'));
      }
    } catch (error) {
      // If anything fails, just show the URL
      log(chalk.yellow('Please visit: https://threejs-ai-frontend.pages.dev/pricing'));
      log(chalk.dim('(This is the default frontend, you can customize it based on your deployment)'));
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
  const [,, command, ...args] = process.argv;
  
  if (command === '-v' || command === '--version') {
    log(pkg.version);
    return;
  }

  const cmd = commands[command] || commands.help;
  await cmd(args);
}

main();