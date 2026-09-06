import axios from 'axios';
import { ConfigManager } from './config.js';
import { BACKEND_URL, formatApiError, log, logError, chalk } from './utils.js';

export async function tokens() {
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
}
