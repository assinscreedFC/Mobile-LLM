/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useChatStore } from '../../store/chatStore';

/**
 * Dynamic route handler for deep links to specific chats.
 * URL pattern: anis:///chat/<chatId>
 * Loads the chat and redirects to the main chat screen.
 */
export default function ChatDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      useChatStore.getState().setCurrentChatId(id);
      router.replace('/chat');
    } else {
      router.replace('/chat');
    }
  }, [id]);

  return null;
}
