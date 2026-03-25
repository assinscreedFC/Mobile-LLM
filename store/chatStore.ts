/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { create } from 'zustand';
import { createSettingsSlice, SettingsSlice } from './slices/settingsSlice';
import { createChatHistorySlice, ChatHistorySlice } from './slices/chatHistorySlice';
import { createStreamingSlice, StreamingSlice } from './slices/streamingSlice';

// Re-export types so existing imports keep working
export type { Message, Attachment } from '../utils/messageHelpers';

interface ChatState extends SettingsSlice, ChatHistorySlice, StreamingSlice {}

export const useChatStore = create<ChatState>((set, get) => ({
  ...createSettingsSlice(set, get),
  ...createChatHistorySlice(set, get),
  ...createStreamingSlice(set, get),
}));
