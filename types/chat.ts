/**
 * Chat domain types shared across store and components.
 *
 * These replace the loose `any` annotations in chatStore's Message and
 * Attachment interfaces with discriminated unions and precise content parts.
 */

// ---------------------------------------------------------------------------
// Content parts (structured message content)
// ---------------------------------------------------------------------------

export interface TextContentPart {
  type: 'text';
  text: string;
}

export interface ImageUrlContentPart {
  type: 'image_url';
  image_url: { url: string };
}

export type ContentPart = TextContentPart | ImageUrlContentPart;

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | ContentPart[];
}

// ---------------------------------------------------------------------------
// Attachment (picked by the user before sending)
// ---------------------------------------------------------------------------

export interface Attachment {
  id?: string;
  type: 'image' | 'file';
  uri: string;
  name?: string;
  mimeType?: string;
  base64?: string;
}
