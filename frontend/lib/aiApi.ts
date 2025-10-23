/**
 * API Client for Remo AI Backend
 * 
 * This handles communication between your frontend and the AI backend server
 */

export type ChatMessage = {
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export type ChatRequest = {
  message: string;
  userId?: string;
  context?: {
    type?: string;
    previousMessages?: string[];
  };
};

export type ChatResponse = {
  response: string;
  type: 'text' | 'roadmap' | 'task' | 'calendar';
  intents?: Record<string, string[]>;
  retrieved_docs?: Array<{
    text: string;
    score: number;
    user: string;
  }>;
  confidence?: number;
  timestamp: string;
};

export type BackendHealth = {
  status: string;
  models_loaded: Record<string, boolean>;
  database_docs: number;
  timestamp: string;
};

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Generic API request helper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config: RequestInit = {
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Check if the AI backend is healthy and available
 */
export async function checkBackendHealth(): Promise<BackendHealth> {
  return apiRequest<BackendHealth>('/health');
}

/**
 * Send a chat message to the AI backend
 */
export async function sendChatMessage(
  message: string,
  userId?: string,
  context?: any
): Promise<ChatResponse> {
  const payload: ChatRequest = {
    message,
    userId,
    context,
  };

  return apiRequest<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Generate a roadmap using the AI backend
 */
export async function generateRoadmap(
  prompt: string,
  userId?: string
): Promise<ChatResponse> {
  const payload: ChatRequest = {
    message: prompt,
    userId,
    context: { type: 'roadmap' },
  };

  return apiRequest<ChatResponse>('/api/generate/roadmap', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Get fallback response when backend is unavailable
 */
export function getFallbackResponse(message: string): ChatResponse {
  return {
    response: `I'm currently offline. Your message "${message}" has been noted, but I need the AI backend to provide an intelligent response. Please check if the backend server is running on port 8000.`,
    type: 'text',
    confidence: 0.1,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Test backend connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const health = await checkBackendHealth();
    return health.status === 'healthy';
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
}