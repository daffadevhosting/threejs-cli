import chalk from 'chalk';

const { log, error: logError } = console;

export const BACKEND_URL = 'https://threejs-ai-backend.harisudahmalam.workers.dev';

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
