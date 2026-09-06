import os from 'os';
import { log, chalk } from './utils.js';

export async function packageCmd() {
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

    exec(command, () => {});
  } catch {
    // Ignore — user can open the URL manually
  }
}
