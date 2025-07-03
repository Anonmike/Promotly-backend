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
    const contentType = res.headers.get('content-type');
    let errorMessage = res.statusText;
    
    try {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || JSON.stringify(errorData);
      } else {
        const text = await res.text();
        // Check if response is HTML (indicating routing issue)
        if (text.startsWith('<!DOCTYPE') || text.includes('<html')) {
          console.error('Received HTML instead of JSON - possible routing issue:', text.substring(0, 200));
          throw new Error(`${res.status}: Server returned HTML instead of JSON. Check API routes.`);
        }
        errorMessage = text || res.statusText;
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      errorMessage = `${res.status}: Could not parse error response`;
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
): Promise<Response>;
export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<Response>;
export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | RequestInit,
  body?: any,
): Promise<Response> {
  let url: string;
  let options: RequestInit = {};
  
  // Handle both function signatures
  if (typeof urlOrOptions === 'string') {
    // First signature: method, url, body
    options.method = methodOrUrl;
    url = urlOrOptions;
    if (body !== undefined) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
  } else {
    // Second signature: url, options
    url = methodOrUrl;
    options = urlOrOptions || {};
  }
  const token = await getClerkToken();
  const sessionId = getSessionId();
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  
  if (options.body && (typeof options.body === 'string' || typeof options.body === 'object')) {
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
