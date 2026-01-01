import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config/config';
import logger from '../utils/logger';

export class GHLClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.GHL_BASE_URL,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${config.GHL_API_KEY}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => {
        const status = err.response?.status;
        if (status === 429) {
          logger.warn('Rate limited by GHL', { status });
        }
        logger.error('GHL request failed', { status, data: err.response?.data });
        return Promise.reject(err);
      }
    );
  }

  async getContact(contactId: string) {
    const res = await this.client.get(`/contacts/${contactId}`);
    return res.data;
  }
}

export const ghlClient = new GHLClient();
export default ghlClient;
