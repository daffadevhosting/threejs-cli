import axios from 'axios';
import { ConfigManager } from './config.js';
import { BACKEND_URL, formatApiError, log, logError, chalk } from './utils.js';
import { resolvePackageAmount } from './buy-resolve.js';

export async function buy(args) {
  const config = new ConfigManager();
  const apiKey = config.get('apiKey');
  const userId = config.get('userId');

  if (!apiKey || !userId) {
    logError(chalk.red('API Key not found. Please register or login first.'));
    return;
  }

  const resolved = await resolvePackageAmount(args);
  if (!resolved) return;
  const { amount, packageType } = resolved;

  log(chalk.blue(`Creating payment order for $${amount} (${packageType} package)...`));

  try {
    const response = await axios.post(`${BACKEND_URL}/api/payments/create-invoice`, {
      amount, packageType
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
}
