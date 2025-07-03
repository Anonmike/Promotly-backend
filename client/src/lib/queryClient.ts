import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global token getter that will be set by Clerk
let getClerkToken: () => Promise<string | null> = async () => null;

export function setClerkTokenGetter(tokenGetter: () => Promise<string | null>) {
  getClerkToken = tokenGetter;
}

// Global session ID getter
let getSessionId: () => string | null = () => localStorage.getItem('sessionId');

export function setSessionIdGetter(sessionIdGetter: () => string | null) {
  getSessionId = sessionIdGetter;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getClerkToken();
  const sessionId = getSessionId();
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  
  if (options.body && typeof options.body === 'string') {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Check for new session ID in response headers
  const newSessionId = res.headers.get('X-Session-ID');
  if (newSessionId && newSessionId !== sessionId) {
    localStorage.setItem('sessionId', newSessionId);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await apiRequest(queryKey[0] as string, { method: "GET" });
      return await res.json();
    } catch (error) {
      if (unauthorizedBehavior === "returnNull" && error instanceof Error && error.message.includes("401")) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
