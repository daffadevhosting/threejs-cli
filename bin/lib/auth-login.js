import { ConfigManager } from './config.js';
import { ThreeJSAPI } from './api.js';
import { parseArgs, log, logError, chalk } from './utils.js';

export async function login(args) {
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
}

export async function register(args) {
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
}
