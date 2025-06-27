// Simple authentication management
const AUTH_TOKEN_KEY = 'social_scheduler_token';
const AUTH_USER_KEY = 'social_scheduler_user';

export interface User {
  id: number;
  username: string;
}

export const authService = {
  // Get current token
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Get current user
  getUser(): User | null {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Set authentication data
  setAuth(token: string, user: User): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  // Clear authentication data
  clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
};

// Auto-login demo user for testing
export const initDemoAuth = async () => {
  if (!authService.isAuthenticated()) {
    try {
      // Try to register/login a demo user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'demo_user',
          password: 'demo_password_123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        authService.setAuth(data.token, data.user);
        return data;
      } else {
        // User might already exist, try login
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'demo_user',
            password: 'demo_password_123'
          })
        });

        if (loginResponse.ok) {
          const data = await loginResponse.json();
          authService.setAuth(data.token, data.user);
          return data;
        }
      }
    } catch (error) {
      console.error('Demo auth setup failed:', error);
    }
  }
  
  return authService.getUser();
};