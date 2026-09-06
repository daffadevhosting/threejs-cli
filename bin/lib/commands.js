import { login, register } from './auth-login.js';
import { createKey, whoami } from './auth-keys.js';
import { generate } from './generate-command.js';
import { tokens } from './tokens-command.js';
import { buy } from './buy-command.js';
import { packageCmd } from './package-command.js';
import { help } from './help-command.js';

export const commands = {
  login,
  register,
  generate,
  createKey,
  whoami,
  tokens,
  buy,
  package: packageCmd,
  help
};
