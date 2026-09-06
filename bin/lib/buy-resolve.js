import axios from 'axios';
import { BACKEND_URL, formatApiError, log, logError, chalk } from './utils.js';

export async function resolvePackageAmount(args) {
  const packageNames = ['basic', 'standard', 'premium', 'pro'];
  if (packageNames.includes(args[0])) {
    const packageType = args[0];
    try {
      const packageResponse = await axios.get(`${BACKEND_URL}/api/packages`, { timeout: 15_000 });
      const packages = packageResponse.data?.packages || [];
      const selectedPackage = packages.find(pkg => pkg.id === packageType);
      if (!selectedPackage) {
        logError(chalk.red(`Package "${packageType}" not found.`));
        log(chalk.yellow('Available packages: basic, standard, premium, pro'));
        return null;
      }
      return { amount: selectedPackage.price, packageType };
    } catch (error) {
      logError(chalk.red('❌ Error fetching package information:'), formatApiError(error));
      return null;
    }
  }
  const amount = parseFloat(args[0]);
  const packageType = args[1] || 'standard';
  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    logError(chalk.red('Usage: three buy <amount> [package-type] or three buy [package-name]'));
    log(chalk.yellow('Examples: three buy 10 standard | three buy premium'));
    return null;
  }
  return { amount, packageType };
}
