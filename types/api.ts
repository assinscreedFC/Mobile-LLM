/**
 * API response types for chatService and chatStore.
 *
 * These interfaces model the shapes returned by the Pleiade (Open WebUI) API
 * and consumed throughout the app. They replace scattered `any` annotations
 * with concrete contracts so strict mode can verify call-sites.
 */

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** Raw model object returned by GET /models */
export interface RawModel {
  id?: string;
  name?: string;
  size?: number;
  parameter_size?: string;
  info?: {
    meta?: {
      capabilities?: {
        vision?: boolean;
      };
    };
  };
}

/** Normalised model info used by the UI */
export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  vision: boolean;
  _raw: RawModel | null;
}

// ---------------------------------------------------------------------------
// Chat CRUD
// ---------------------------------------------------------------------------

/** Shape sent inside `createNewChat` / `updateChat` payloads */
export interface HistoryMessage {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  models?: string[];
  model?: string;
  modelName?: string;
  modelIdx?: number;
}

/** Returned by POST /chats/new and GET /chats/:id */
export interface ChatData {
  id: string;
  title: string;
  chat: {
    models: string[];
    history: {
      messages: Record<string, HistoryMessage>;
      currentId: string | null;
    };
    messages: HistoryMessage[];
    params: Record<string, unknown>;
    files?: UploadedFileRef[];
    tags?: string[];
    timestamp?: number;
  };
}

/** Minimal chat summary returned by GET /chats/ (history list) */
export interface ChatSummary {
  id: string;
  title: string;
  updated_at: number;
  created_at: number;
}

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

/** Raw response from POST /files/ */
export interface FileUploadResponse {
  id: string;
  filename?: string;
  path?: string;
  meta?: Record<string, unknown>;
}

/** Normalised uploaded-file reference used in payloads */
export interface UploadedFileRef {
  id: string;
  name: string;
  url: string;
  meta: Record<string, unknown>;
  mimeType: string;
  type?: 'image' | 'file';
}

// ---------------------------------------------------------------------------
// Streaming / completions
// ---------------------------------------------------------------------------

/** Payload sent to POST /api/chat/completions (stream) */
export interface StreamCompletionPayload {
  model: string;
  messages: Array<{ role: string; content: string | unknown[] }>;
  params: { temperature: number; max_tokens: number };
  stream?: boolean;
  tool_servers?: unknown[];
  features?: {
    voice: boolean;
    image_generation: boolean;
    code_interpreter: boolean;
    web_search: boolean;
  };
  variables?: Record<string, unknown>;
  model_item?: ModelItem;
  chat_id?: string | null;
  id?: string;
  parent_id?: string;
  parent_message?: HistoryMessage;
  background_tasks?: {
    title_generation: boolean;
    tags_generation: boolean;
    follow_up_generation: boolean;
  };
  files?: Array<{
    type: string;
    id: string;
    filename: string;
    meta?: Record<string, unknown>;
  }>;
}

/** SSE chunk shape from the streaming endpoint */
export interface StreamChunk {
  choices?: Array<{
    delta?: { content?: string };
  }>;
  task_id?: string;
}

// ---------------------------------------------------------------------------
// Chat completed
// ---------------------------------------------------------------------------

export interface ChatCompletedPayload {
  model: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  model_item: ModelItem;
  chat_id: string;
  session_id: string;
  id: string;
}

// ---------------------------------------------------------------------------
// Model item (sent in stream / completed payloads)
// ---------------------------------------------------------------------------

export interface ModelItem {
  id: string;
  name: string;
  object: string;
  connection_type: string;
  tags: string[];
  info: {
    id: string;
    name: string;
    meta: {
      capabilities: {
        vision: boolean;
        file_upload: boolean;
        web_search: boolean;
        image_generation: boolean;
        code_interpreter: boolean;
        citations: boolean;
      };
    };
  };
  actions: unknown[];
  filters: unknown[];
}

// ---------------------------------------------------------------------------
// Title generation
// ---------------------------------------------------------------------------

export interface TitleCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

// ---------------------------------------------------------------------------
// Knowledge
// ---------------------------------------------------------------------------

export interface KnowledgeResponse {
  items: unknown[];
  total: number;
}

// ---------------------------------------------------------------------------
// ADE (emploi du temps)
// ---------------------------------------------------------------------------

export interface ADEStatus {
  authenticated: boolean;
  has_credentials: boolean;
  project_id: string | null;
  resources_count: number;
}
