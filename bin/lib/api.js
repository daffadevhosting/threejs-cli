import axios from 'axios';
import { BACKEND_URL, formatApiError, logError, chalk } from './utils.js';
import { saveProjectFiles } from './save-project.js';

export class ThreeJSAPI {
  constructor(apiKey, userId, baseURL = BACKEND_URL) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.userId = userId;

    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 120_000,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    this.authClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30_000,
      headers: {
        'Authorization': `Bearer ${this.userId}`,
        'Content-Type': 'application/json'
      }
    });
  }

  static async register(email, username) {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/register`, { email, username }, { timeout: 30_000 });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Registration failed:'), formatApiError(error));
      return null;
    }
  }

  static async login(username, key) {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, { username, key }, { timeout: 30_000 });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Login failed:'), formatApiError(error));
      return null;
    }
  }

  async generateProject(specs) {
    try {
      const response = await this.apiClient.post('/api/generate-project', specs);
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Error generating project:'), formatApiError(error));
      return null;
    }
  }

  async createApiKey(name) {
    try {
      const response = await this.authClient.post('/api/api-keys', { name });
      return response.data;
    } catch (error) {
      logError(chalk.red('❌ Error creating API key:'), formatApiError(error, 'Ensure you are registered and logged in.'));
      return null;
    }
  }

  static saveProjectFiles = saveProjectFiles;
}
