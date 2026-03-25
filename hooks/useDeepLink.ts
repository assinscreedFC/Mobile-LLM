/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useChatStore } from '../store/chatStore';

/**
 * Hook that listens for incoming deep links and navigates to the appropriate chat.
 *
 * Supported URL patterns:
 * - anis:///chat?id=<chatId> → loads specific chat
 * - anis:///chat/<chatId> → loads specific chat (dynamic route)
 * - https://pleiade.mi.parisdescartes.fr/chat/<chatId> → universal link
 */
export function useDeepLink() {
  useEffect(() => {
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) handleURL(url);
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleURL(event.url);
    });

    handleInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);
}

function handleURL(url: string) {
  try {
    const parsed = Linking.parse(url);

    // Pattern: anis:///chat?id=<chatId>
    const chatId = parsed.queryParams?.id;
    if (typeof chatId === 'string' && chatId) {
      useChatStore.getState().setCurrentChatId(chatId);
      return;
    }

    // Pattern: anis:///chat/<chatId> (path segment)
    if (parsed.path?.startsWith('chat/')) {
      const pathChatId = parsed.path.replace('chat/', '');
      if (pathChatId) {
        useChatStore.getState().setCurrentChatId(pathChatId);
      }
    }
  } catch (error) {
    console.error('[DeepLink] Error parsing URL:', error);
  }
}
