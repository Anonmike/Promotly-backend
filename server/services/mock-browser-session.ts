/**
 * Mock Browser Session Service for testing when Python service is unavailable
 * This provides the same interface as the Python service but with simulated responses
 */

export interface BrowserSessionData {
  user_id: string;
  site_name: string;
  status: 'active' | 'pending' | 'expired';
  created_at: string;
  last_used: string;
  login_url?: string;
}

export class MockBrowserSessionService {
  private sessions: Map<string, BrowserSessionData> = new Map();
  
  private getSessionKey(userId: string, siteName: string): string {
    return `${userId}:${siteName}`;
  }
  
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
  
  async createSession(userId: string, siteName: string, loginUrl: string): Promise<{
    message: string;
    session_id: string;
    login_url: string;
    instructions: string;
  }> {
    const sessionKey = this.getSessionKey(userId, siteName);
    const session: BrowserSessionData = {
      user_id: userId,
      site_name: siteName,
      status: 'pending',
      created_at: new Date().toISOString(),
      last_used: new Date().toISOString(),
      login_url: loginUrl
    };
    
    this.sessions.set(sessionKey, session);
    
    return {
      message: `Browser session created for ${siteName}`,
      session_id: sessionKey,
      login_url: loginUrl,
      instructions: `A browser window will open for ${siteName}. Please log in manually and then click 'Confirm Login' when done.`
    };
  }
  
  async confirmLogin(userId: string, siteName: string): Promise<{
    message: string;
    session_saved: boolean;
    expires_at: string;
  }> {
    const sessionKey = this.getSessionKey(userId, siteName);
    const session = this.sessions.get(sessionKey);
    
    if (!session) {
      throw new Error(`Session not found for ${userId}:${siteName}`);
    }
    
    session.status = 'active';
    session.last_used = new Date().toISOString();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    return {
      message: `Login confirmed for ${siteName}`,
      session_saved: true,
      expires_at: expiresAt.toISOString()
    };
  }
  
  async executeAction(userId: string, siteName: string, actionType: string, actionData: any = {}): Promise<{
    success: boolean;
    message: string;
    action_result: any;
  }> {
    const sessionKey = this.getSessionKey(userId, siteName);
    const session = this.sessions.get(sessionKey);
    
    if (!session) {
      throw new Error(`Session not found for ${userId}:${siteName}`);
    }
    
    if (session.status !== 'active') {
      throw new Error(`Session for ${userId}:${siteName} is not active`);
    }
    
    session.last_used = new Date().toISOString();
    
    // Simulate different action types
    switch (actionType) {
      case 'post':
        return {
          success: true,
          message: `Post published to ${siteName}`,
          action_result: {
            post_id: `mock_${Date.now()}`,
            url: `https://${siteName}.com/post/mock_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        };
      case 'validate':
        return {
          success: true,
          message: `Session validated for ${siteName}`,
          action_result: {
            valid: true,
            expires_at: session.last_used
          }
        };
      default:
        return {
          success: false,
          message: `Unknown action type: ${actionType}`,
          action_result: null
        };
    }
  }
  
  async listSessions(userId?: string): Promise<{ sessions: BrowserSessionData[] }> {
    const sessionList = Array.from(this.sessions.values());
    
    if (userId) {
      return {
        sessions: sessionList.filter(session => session.user_id === userId)
      };
    }
    
    return {
      sessions: sessionList
    };
  }
  
  async deleteSession(userId: string, siteName: string): Promise<{
    message: string;
    deleted: boolean;
  }> {
    const sessionKey = this.getSessionKey(userId, siteName);
    const existed = this.sessions.has(sessionKey);
    
    if (existed) {
      this.sessions.delete(sessionKey);
    }
    
    return {
      message: existed ? `Session deleted for ${siteName}` : `No session found for ${siteName}`,
      deleted: existed
    };
  }
}

export const mockBrowserSessionService = new MockBrowserSessionService();