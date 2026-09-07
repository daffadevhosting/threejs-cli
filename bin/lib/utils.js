import chalk from 'chalk';

const { log, error: logError } = console;

export const BACKEND_URL = 'https://threejs-ai-backend.harisudahmalam.workers.dev';

export function normalizeVersion(version = '') {
  return String(version).trim().replace(/^v/, '').split(/[-+]/)[0] || '0.0.0';
}

export function compareVersions(currentVersion, latestVersion) {
  const a = normalizeVersion(currentVersion).split('.').map(Number);
  const b = normalizeVersion(latestVersion).split('.').map(Number);
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }

  return 0;
}

export async function checkForUpdates(currentVersion = '0.0.0') {
  try {
    const response = await fetch('https://registry.npmjs.org/threejs-ai-cli/latest', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      return { hasUpdate: false, latestVersion: currentVersion, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const latestVersion = data?.version || currentVersion;
    const comparison = compareVersions(currentVersion, latestVersion);

    return {
      hasUpdate: comparison < 0,
      currentVersion,
      latestVersion,
      error: null
    };
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: error.message || 'Unable to check updates'
    };
  }
}

export async function notifyIfUpdateAvailable(currentVersion) {
  const updateInfo = await checkForUpdates(currentVersion);
  if (!updateInfo.hasUpdate) return false;

  log(chalk.yellow(`\n⚠️  Update available: ${currentVersion} → ${updateInfo.latestVersion}`));
  log(chalk.cyan('Run: npm install -g threejs-ai-cli'));
  return true;
}

/** Extract a user-friendly message from an axios / network error */
export function formatApiError(error, fallback = 'Unknown error') {
  if (error.response) {
    const data = error.response.data;
    const msg = data?.error || data?.message || data?.detail || JSON.stringify(data);
    return `${msg} (HTTP ${error.response.status})`;
  }
  if (error.request) {
    return 'No response from server. Check your network or the backend URL.';
  }
  return error.message || fallback;
}

export function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

export { log, logError, chalk };
