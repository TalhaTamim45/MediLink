// Browser-compatible Odoo API Service using localStorage

const ODOO_BASE_URL = 'http://localhost:8069';
const DB_NAME = 'MedicalApp';

class OdooApiService {
  constructor() {
    this.sessionId = localStorage.getItem('@odoo_session_id') || null;
    this.userId = localStorage.getItem('@odoo_user_id') ? parseInt(localStorage.getItem('@odoo_user_id'), 10) : null;
    this.userName = localStorage.getItem('@odoo_user_name') || null;
  }

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

        localStorage.setItem('@odoo_session_id', this.sessionId);
        localStorage.setItem('@odoo_user_id', String(this.userId));
        localStorage.setItem('@odoo_user_name', this.userName);

        return result;
      } else {
        throw new Error(result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Odoo Login Error:', error);
      throw error;
    }
  }

  logout() {
    this.sessionId = null;
    this.userId = null;
    this.userName = null;
    localStorage.removeItem('@odoo_session_id');
    localStorage.removeItem('@odoo_user_id');
    localStorage.removeItem('@odoo_user_name');
  }

  async _request(path, params = {}) {
    const url = `${ODOO_BASE_URL}${path}`;
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        ...params,
        session_id: this.sessionId,
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
        throw new Error(data.error.message || 'API request failed');
      }

      const result = data.result;
      if (result && result.success === false) {
        throw new Error(result.error || 'API request failed');
      }

      return result;
    } catch (error) {
      console.error(`Odoo API Error on ${path}:`, error);
      throw error;
    }
  }

  async searchRead(model, domain = [], fields = [], limit = 80, offset = 0, order = null) {
    return this._request('/api/mobile/search_read', {
      model,
      domain,
      fields,
      limit,
      offset,
      order,
    });
  }

  async write(model, recordId, values) {
    return this._request('/api/mobile/write', {
      model,
      record_id: recordId,
      values,
    });
  }

  async unlink(model, recordId) {
    return this._request('/api/mobile/unlink', {
      model,
      record_id: recordId,
    });
  }
}

const odooApi = new OdooApiService();
export default odooApi;
