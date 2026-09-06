import { log, chalk } from './utils.js';

export function help() {
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
