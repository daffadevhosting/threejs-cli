import { ConfigManager } from './config.js';
import { ThreeJSAPI } from './api.js';
import { log, logError, chalk } from './utils.js';

export async function generate(args) {
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
}
