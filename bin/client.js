import { createRequire } from 'module';
import { commands } from './lib/commands.js';
import { log, logError, chalk, notifyIfUpdateAvailable } from './lib/utils.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const COMMAND_VERSION_FLAGS = ['-v', '--version', 'version'];

async function main() {
  try {
    const [,, command, ...args] = process.argv;

    // Validate command input
    if (typeof command !== 'string') {
      throw new Error('Invalid command provided');
    }

    // Handle version check
    if (COMMAND_VERSION_FLAGS.includes(command.toLowerCase())) {
      log(pkg.version);
      return;
    }

    // Notify about updates for non-help commands
    if (command && !['help'].includes(command)) {
      await notifyIfUpdateAvailable(pkg.version);
    }

    // Normalize hyphenated commands (e.g. create-key -> createKey)
    const normalized = command
      ? command.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      :null;

    if (!normalized) {
      throw new Error('No command provided');
    }

    const cmd = commands[normalized] || commands.help;
    await cmd(args);
  } catch (error) {
    logError(chalk.red('❌ Unexpected error:'), error.message || error);
    if (process.env.DEBUG) {
      logError(chalk.red('Stack trace:'), error.stack);
    }
    process.exitCode = 1;
  }
}

main();