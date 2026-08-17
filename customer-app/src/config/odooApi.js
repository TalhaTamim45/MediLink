import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your Odoo server IP/URL and port
// For local development on Android Emulator, use '10.0.2.2' instead of '127.0.0.1'
const ODOO_BASE_URL = 'http://localhost:8069'; // Physical device on LAN
const DB_NAME = 'MedicalApp'; // The database we verified

class OdooApiService {
  constructor() {
    this.sessionId = null;
    this.userId = null;
    this.userName = null;
    this.partnerId = null;
  }

  /**
   * Helper to load stored session on app startup
   */
  async initSession() {
    try {
      const sessionData = await AsyncStorage.getItem('@odoo_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        this.sessionId = parsed.sessionId;
        this.userId = parsed.userId;
        this.userName = parsed.userName;
        this.partnerId = parsed.partnerId;
        return true;
      }
    } catch (e) {
      console.error('Failed to load Odoo session', e);
    }
    return false;
  }

  /**
   * Clear session on logout
   */
  async logout() {
    this.sessionId = null;
    this.userId = null;
    this.userName = null;
    this.partnerId = null;
    try {
      await AsyncStorage.removeItem('@odoo_session');
    } catch (e) {
      console.error('Failed to clear Odoo session', e);
    }
  }

  /**
   * Register Request
   */
  async register(email, password, name, phone, role = 'customer') {
    const url = `${ODOO_BASE_URL}/api/mobile/register`;
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: DB_NAME,
        login: email,
        password: password,
        name: name,
        phone: phone,
        role: role,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Registration failed');
      }

      const result = data.result;
      if (result && result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Odoo Registration Error:', error);
      throw error;
    }
  }

  /**
   * Login Request
   */
  async login(login, password) {
    const url = `${ODOO_BASE_URL}/api/mobile/login`;
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: DB_NAME,
        login: login,
        password: password,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Login failed');
      }

      const result = data.result;
      if (result && result.success) {
        this.sessionId = result.session_id;
        this.userId = result.uid;
        this.userName = result.name;
        this.partnerId = result.partner_id;

        // Persist session info
        await AsyncStorage.setItem(
          '@odoo_session',
          JSON.stringify({
            sessionId: this.sessionId,
            userId: this.userId,
            userName: this.userName,
            partnerId: this.partnerId,
          })
        );

        return result;
      } else {
        throw new Error(result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Odoo Login Error:', error);
      throw error;
    }
  }

  /**
   * Generic request helper to handle JSON-RPC wrapping and session routing
   */
  async _request(path, params = {}) {
    if (!this.sessionId) {
      // Try to load stored session first
      const hasSession = await this.initSession();
      if (!hasSession) {
        throw new Error('No active session. Please login first.');
      }
    }

    // Append session_id to URL query to bypass mobile cookie jars
    const url = `${ODOO_BASE_URL}${path}?session_id=${this.sessionId}`;

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: params,
    };

    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.sessionId) {
      headers['Cookie'] = `session_id=${this.sessionId}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        // If session expired
        if (data.error.data && data.error.data.name === 'odoo.exceptions.AccessError') {
          await this.logout();
        }
        throw new Error(data.error.message || 'API request error');
      }

      const result = data.result;
      if (result && result.success) {
        return result;
      } else {
        throw new Error(result.error || 'API returned failure status');
      }
    } catch (error) {
      console.error(`Odoo API Error at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Fetch records from a model
   */
  async searchRead(model, domain = [], fields = [], limit = 80, offset = 0, order = '') {
    return this._request('/api/mobile/search_read', {
      model,
      domain,
      fields,
      limit,
      offset,
      order,
    });
  }

  /**
   * Create a record
   */
  async create(model, values) {
    return this._request('/api/mobile/create', {
      model,
      values,
    });
  }

  /**
   * Update a record
   */
  async write(model, recordId, values) {
    return this._request('/api/mobile/write', {
      model,
      record_id: recordId,
      values,
    });
  }

  /**
   * Delete a record
   */
  async unlink(model, recordId) {
    return this._request('/api/mobile/unlink', {
      model,
      record_id: recordId,
    });
  }
}

export default new OdooApiService();
