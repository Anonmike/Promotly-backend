import axios from 'axios';

export interface BrowserSessionRequest {
  user_id: string;
  site_name: string;
  login_url: string;
}

export interface ActionRequest {
  user_id: string;
  site_name: string;
  action_type: string;
  action_data?: Record<string, any>;
}

export interface SessionInfo {
  user_id: string;
  site_name: string;
  created_at: string;
  last_used: string;
  is_valid: boolean;
  is_expired: boolean;
}

export class BrowserSessionClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async createSession(userId: string, siteName: string, loginUrl: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/create-session`, {
        user_id: userId,
        site_name: siteName,
        login_url: loginUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error creating browser session:', error);
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async confirmLogin(userId: string, siteName: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/confirm-login/${userId}/${siteName}`);
      return response.data;
    } catch (error) {
      console.error('Error confirming login:', error);
      throw new Error(`Failed to confirm login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeAction(userId: string, siteName: string, actionType: string, actionData: Record<string, any> = {}): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/execute-action`, {
        user_id: userId,
        site_name: siteName,
        action_type: actionType,
        action_data: actionData
      });
      return response.data;
    } catch (error) {
      console.error('Error executing action:', error);
      throw new Error(`Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listSessions(userId?: string): Promise<SessionInfo[]> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await axios.get(`${this.baseUrl}/sessions`, { params });
      return response.data.sessions || [];
    } catch (error) {
      console.error('Error listing sessions:', error);
      throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSession(userId: string, siteName: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.baseUrl}/sessions/${userId}/${siteName}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('Browser session service health check failed:', error);
      throw new Error(`Browser session service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async postToLinkedIn(userId: string, content: string, mediaUrls: string[] = []): Promise<any> {
    return this.executeAction(userId, 'linkedin', 'post_message', {
      message: content,
      media_urls: mediaUrls
    });
  }

  async postToTwitter(userId: string, content: string, mediaUrls: string[] = []): Promise<any> {
    return this.executeAction(userId, 'twitter', 'post_tweet', {
      message: content,
      media_urls: mediaUrls
    });
  }

  async postToFacebook(userId: string, content: string, mediaUrls: string[] = []): Promise<any> {
    return this.executeAction(userId, 'facebook', 'post_message', {
      message: content,
      media_urls: mediaUrls
    });
  }

  async validateSession(userId: string, siteName: string): Promise<boolean> {
    try {
      const sessions = await this.listSessions(userId);
      const session = sessions.find(s => s.user_id === userId && s.site_name === siteName);
      return session ? session.is_valid && !session.is_expired : false;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }
}

export const browserSessionClient = new BrowserSessionClient();