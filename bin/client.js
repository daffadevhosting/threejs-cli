import { createRequire } from 'module';
import { commands } from './lib/commands.js';
import { log, logError, chalk } from './lib/utils.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

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
