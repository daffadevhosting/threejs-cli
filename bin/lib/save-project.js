import fs from 'fs';
import path from 'path';
import { log, logError, chalk } from './utils.js';

export async function saveProjectFiles(files, projectName) {
  if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
    logError(chalk.red('❌ No project files received from the server.'));
    return false;
  }

  const safeName = (projectName || 'threejs-project')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const projectDir = path.join(process.cwd(), safeName);

  try {
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    for (const [filename, content] of Object.entries(files)) {
      if (typeof content !== 'string') {
        log(chalk.yellow(`   ⚠️  Skipping non-text file: ${filename}`));
        continue;
      }
      const filePath = path.join(projectDir, filename);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      log(chalk.green(`   📄 Created: ${filePath}`));
    }

    log(chalk.blue(`\n🎉 Project saved to: ${projectDir}`));
    log(chalk.yellow(`\n🚀 To get started, run:\n   cd ${safeName}\n   npm install\n   npm run dev`));
    return true;
  } catch (error) {
    logError(chalk.red('❌ Failed to write project files:'), error.message);
    return false;
  }
}
