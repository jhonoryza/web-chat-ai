export interface Provider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
  ts: number;
  err?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  providerId: string | null;
  model: string;
  system: string;
  temperature: number;
  maxTokens: number;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  theme: 'dark' | 'light';
  providers: Provider[];
  activeProviderId: string | null;
  activeConvId: string | null;
  tinyfishKey: string;
  webSearch: boolean;
  searchProvider: 'tinyfish' | 'searxng';
  searxngUrl: string;
}

export type LogStatus = 'ok' | 'error' | 'stopped';

export interface LogEntry {
  ts: number;
  type: 'chat' | 'models' | 'web-search' | 'web-fetch';
  provider: string;
  model: string;
  status: LogStatus;
  ms: number;
  http: number;
  tok?: { pt: number; ct: number } | null;
  count?: number | null;
  req?: string;
  res?: string;
  raw?: string;
  err?: string;
}
