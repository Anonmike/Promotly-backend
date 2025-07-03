import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Session {
  id: number;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt?: string;
  userAgent?: string;
  isCurrent: boolean;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem('sessionId')
  );
  const queryClient = useQueryClient();

  // Store session ID in localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  // Listen for new session IDs from API responses
  useEffect(() => {
    const handleStorageChange = () => {
      const newSessionId = localStorage.getItem('sessionId');
      if (newSessionId !== sessionId) {
        setSessionId(newSessionId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionId]);

  // Get all user sessions
  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/auth/sessions'],
    enabled: !!sessionId,
  });

  // Delete a specific session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionIdToDelete: string) => {
      const response = await apiRequest(`/api/auth/sessions/${sessionIdToDelete}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/sessions'] });
    },
  });

  // Delete all sessions (logout from all devices)
  const deleteAllSessionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/auth/sessions', {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      setSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/sessions'] });
      queryClient.clear(); // Clear all cached data
    },
  });

  const sessions: Session[] = sessionsData?.sessions || [];
  const currentSession = sessions.find(s => s.isCurrent);

  return {
    sessionId,
    sessions,
    currentSession,
    isLoadingSessions,
    deleteSession: deleteSessionMutation.mutate,
    deleteAllSessions: deleteAllSessionsMutation.mutate,
    isDeletingSession: deleteSessionMutation.isPending,
    isDeletingAllSessions: deleteAllSessionsMutation.isPending,
  };
}