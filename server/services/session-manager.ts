import { storage } from "../storage";
import { randomBytes } from "crypto";
import type { InsertUserSession, UserSession } from "@shared/schema";

export class SessionManager {
  private readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupJob();
  }

  /**
   * Create a new persistent session for a user
   */
  async createSession(userId: number, clerkUserId: string, sessionData: Record<string, any> = {}): Promise<UserSession> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    const session: InsertUserSession = {
      sessionId,
      userId,
      clerkUserId,
      data: sessionData,
      expiresAt,
    };

    return await storage.createSession(session);
  }

  /**
   * Get a session by ID and verify it's not expired
   */
  async getValidSession(sessionId: string): Promise<UserSession | null> {
    const session = await storage.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | null> {
    const updatedSession = await storage.updateSession(sessionId, updates);
    return updatedSession || null;
  }

  /**
   * Extend session expiration time
   */
  async extendSession(sessionId: string): Promise<UserSession | null> {
    const newExpiresAt = new Date(Date.now() + this.SESSION_DURATION);
    return await this.updateSession(sessionId, { expiresAt: newExpiresAt });
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return await storage.deleteSession(sessionId);
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteUserSessions(userId: number): Promise<number> {
    const userSessions = await storage.getUserSessions(userId);
    let deletedCount = 0;

    for (const session of userSessions) {
      const deleted = await storage.deleteSession(session.sessionId);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: number): Promise<UserSession[]> {
    const sessions = await storage.getUserSessions(userId);
    const now = new Date();
    
    // Filter out expired sessions
    return sessions.filter(session => session.expiresAt > now);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const deletedCount = await storage.deleteExpiredSessions();
      console.log(`Cleaned up ${deletedCount} expired sessions`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Start automatic cleanup of expired sessions
   */
  private startCleanupJob(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);

    console.log('Session cleanup job started');
  }

  /**
   * Stop the cleanup job
   */
  public stopCleanupJob(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('Session cleanup job stopped');
    }
  }

  /**
   * Validate session ID format
   */
  public isValidSessionId(sessionId: string): boolean {
    return typeof sessionId === 'string' && /^[a-f0-9]{64}$/.test(sessionId);
  }
}

export const sessionManager = new SessionManager();