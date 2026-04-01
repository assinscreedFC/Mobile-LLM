/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { chatService } from '../../services/chatService';

export interface ChatHistorySlice {
  history: any[];
  archivedChats: any[];
  fetchHistory: () => Promise<void>;
  fetchArchivedChats: () => Promise<void>;
  toggleArchiveChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  archiveAllChats: () => Promise<void>;
  unarchiveAllChats: () => Promise<void>;
  deleteAllChats: () => Promise<void>;
}

export const createChatHistorySlice = (set: any, get: any): ChatHistorySlice => ({
  history: [],
  archivedChats: [],

  fetchHistory: async () => {
    try {
      const data = await chatService.getHistory(1);
      const list = Array.isArray(data) ? data : [];
      set({ history: list });
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  },

  fetchArchivedChats: async () => {
    try {
      const data = await chatService.getArchivedChats(1);
      const list = Array.isArray(data) ? data : [];
      set({ archivedChats: list });
    } catch (error) {
      console.error('Erreur archived chats:', error);
    }
  },

  toggleArchiveChat: async (chatId: string) => {
    try {
      await chatService.toggleArchiveChat(chatId);
      await get().fetchArchivedChats();
      await get().fetchHistory();
    } catch (error) {
      console.error('Erreur toggle archive:', error);
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      await chatService.deleteChat(chatId);
      await get().fetchArchivedChats();
      await get().fetchHistory();
    } catch (error) {
      console.error("Erreur delete chat:", error);
    }
  },

  archiveAllChats: async () => {
    try {
      await chatService.archiveAllChats();
      await get().fetchHistory();
      await get().fetchArchivedChats();
    } catch (error) {
      console.error("Erreur archive all chats:", error);
    }
  },

  unarchiveAllChats: async () => {
    try {
      await chatService.unarchiveAllChats();
      await get().fetchHistory();
      await get().fetchArchivedChats();
    } catch (error) {
      console.error("Erreur unarchive all chats:", error);
    }
  },

  deleteAllChats: async () => {
    try {
      await chatService.deleteAllChats();
      await get().fetchHistory();
      await get().fetchArchivedChats();
    } catch (error) {
      console.error("Erreur delete all chats:", error);
    }
  },
});
