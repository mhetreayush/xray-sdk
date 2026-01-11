/**
 * API Client - HTTP client for backend API calls
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export interface Project {
  _id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trace {
  _id: string;
  traceId: string;
  projectId: string;
  status: "success" | "failure" | "pending";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  _id: string;
  stepId: string;
  traceId: string;
  projectId: string;
  stepName: string;
  stepNumber: number;
  artifacts: Array<{
    dataId: string;
    type: "input" | "output" | null;
  }>;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface SchemaShape {
  [key: string]: string | SchemaShape;
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Set auth token in localStorage
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

/**
 * Remove auth token from localStorage
 */
export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

/**
 * Make API request with authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => "Unknown error");
    throw new Error(`API request failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Authentication API
 */
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

/**
 * Projects API
 */
export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyCreateResponse {
  apiKey: {
    id: string;
    key: string;
    name: string;
  };
}

export const projectsApi = {
  list: async (): Promise<{ projects: Project[] }> => {
    return apiRequest<{ projects: Project[] }>("/api/v1/projects");
  },

  create: async (name: string): Promise<{ project: Project }> => {
    return apiRequest<{ project: Project }>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  listApiKeys: async (projectId: string): Promise<{ apiKeys: ApiKey[] }> => {
    return apiRequest<{ apiKeys: ApiKey[] }>(
      `/api/v1/projects/${projectId}/keys`
    );
  },

  createApiKey: async (
    projectId: string,
    name: string
  ): Promise<ApiKeyCreateResponse> => {
    return apiRequest<ApiKeyCreateResponse>(
      `/api/v1/projects/${projectId}/keys`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );
  },

  deleteApiKey: async (
    projectId: string,
    keyId: string
  ): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(
      `/api/v1/projects/${projectId}/keys/${keyId}`,
      {
        method: "DELETE",
      }
    );
  },
};

/**
 * Traces API
 */
export const tracesApi = {
  list: async (
    projectId: string,
    limit: number = 10
  ): Promise<{ traces: Trace[]; nextCursor: string | null }> => {
    return apiRequest<{ traces: Trace[]; nextCursor: string | null }>(
      `/api/v1/projects/${projectId}/traces?limit=${limit}`
    );
  },

  get: async (
    projectId: string,
    traceId: string
  ): Promise<{ trace: Trace; steps: Step[] }> => {
    return apiRequest<{ trace: Trace; steps: Step[] }>(
      `/api/v1/projects/${projectId}/traces/${traceId}`
    );
  },
};

/**
 * Query API
 */
export const queryApi = {
  querySteps: async (
    projectId: string,
    filter: Record<string, unknown>,
    limit: number = 50
  ): Promise<{ results: Step[]; nextCursor: string | null }> => {
    return apiRequest<{ results: Step[]; nextCursor: string | null }>(
      `/api/v1/projects/${projectId}/query`,
      {
        method: "POST",
        body: JSON.stringify({ filter, limit }),
      }
    );
  },

  getSchemas: async (projectId: string): Promise<{ schema: SchemaShape }> => {
    return apiRequest<{ schema: SchemaShape }>(
      `/api/v1/projects/${projectId}/schemas`
    );
  },

  getDataUrl: async (
    projectId: string,
    traceId: string,
    dataId: string
  ): Promise<{
    presignedUrl: string;
    key: string;
    metadata: Record<string, unknown>;
  }> => {
    return apiRequest<{
      presignedUrl: string;
      key: string;
      metadata: Record<string, unknown>;
    }>(`/api/v1/projects/${projectId}/traces/${traceId}/data/${dataId}`);
  },
};

/**
 * Example App API - for testing use cases
 */
const EXAMPLE_APP_BASE_URL =
  process.env.NEXT_PUBLIC_EXAMPLE_APP_BASE_URL || "http://localhost:3002";

export interface UseCase {
  id: string;
  name: string;
  description: string;
  requiredInput: Record<string, string>;
}

export interface UseCaseExecuteRequest {
  useCase: "competitor-discovery" | "product-categorization";
  input: Record<string, unknown>;
}

export interface UseCaseExecuteResponse {
  success: boolean;
  useCase: string;
  result?: unknown;
  error?: string;
}

export const exampleAppApi = {
  listUseCases: async (): Promise<{ useCases: UseCase[] }> => {
    const response = await fetch(`${EXAMPLE_APP_BASE_URL}/api/v1/use-cases`);
    if (!response.ok) {
      throw new Error(`Failed to fetch use cases: ${response.status}`);
    }
    return response.json();
  },

  executeUseCase: async (
    request: UseCaseExecuteRequest
  ): Promise<UseCaseExecuteResponse> => {
    const response = await fetch(
      `${EXAMPLE_APP_BASE_URL}/api/v1/use-cases/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Unknown error",
      }));
      throw new Error(
        error.error || `Failed to execute use case: ${response.status}`
      );
    }
    return response.json();
  },
};
