import { ConfigManager } from './config.js';
import { ThreeJSAPI } from './api.js';
import { log, logError, chalk } from './utils.js';

export async function createKey(args) {
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
}

export function whoami() {
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
}
