/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import * as FileSystem from 'expo-file-system';
import { chatService } from '../../services/chatService';
import { generateUUID } from '../../utils/uuid';
import { Message, buildModelItem, buildHistoryPayload, getDisplayText } from '../../utils/messageHelpers';
import { ADE_SYSTEM_PROMPT, ADE_MAX_ITERATIONS, processADECalls } from './adeSlice';
import type { LLMParams } from './settingsSlice';

/** Build API params object from store, omitting null values */
function buildApiParams(state: LLMParams): Record<string, any> {
  const p: Record<string, any> = {
    temperature: state.temperature,
    max_tokens: state.maxTokens,
    top_k: state.topK,
    top_p: state.topP,
  };
  if (state.minP != null) p.min_p = state.minP;
  if (state.frequencyPenalty != null) p.frequency_penalty = state.frequencyPenalty;
  if (state.presencePenalty != null) p.presence_penalty = state.presencePenalty;
  if (state.repeatPenalty != null) p.repeat_penalty = state.repeatPenalty;
  if (state.repeatLastN != null) p.repeat_last_n = state.repeatLastN;
  if (state.mirostat != null) p.mirostat = state.mirostat;
  if (state.mirostatEta != null) p.mirostat_eta = state.mirostatEta;
  if (state.mirostatTau != null) p.mirostat_tau = state.mirostatTau;
  if (state.tfsZ != null) p.tfs_z = state.tfsZ;
  if (state.seed != null) p.seed = state.seed;
  if (state.stop) p.stop = state.stop.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (state.numCtx != null) p.num_ctx = state.numCtx;
  if (state.numBatch != null) p.num_batch = state.numBatch;
  if (state.numKeep != null) p.num_keep = state.numKeep;
  if (state.think) p.think = true;
  return p;
}

export interface StreamingSlice {
  currentChatId: string | null;
  userMessages: Message[];
  modelResponses: Record<string, Record<string, string>>;
  activeModels: string[];
  isTyping: boolean;
  currentTaskIds: string[];
  currentEventSources: any[];
  _stopRequested: boolean;
  _historyTimeoutId: ReturnType<typeof setTimeout> | null;
  startNewChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  stopGeneration: () => Promise<void>;
  setCurrentChatId: (chatId: string) => Promise<void>;
  regenerateResponse: (userMsgId: string) => Promise<void>;
  editAndResend: (userMsgId: string, newContent: string) => Promise<void>;
}

export const createStreamingSlice = (set: any, get: any): StreamingSlice => ({
  currentChatId: null,
  userMessages: [],
  modelResponses: {},
  activeModels: ['athene-v2:latest'],
  isTyping: false,
  currentTaskIds: [],
  currentEventSources: [],
  _stopRequested: false,
  _historyTimeoutId: null,

  startNewChat: async () => {
    const { _historyTimeoutId } = get();
    if (_historyTimeoutId !== null) clearTimeout(_historyTimeoutId);
    set({
      currentChatId: null,
      userMessages: [],
      modelResponses: {},
      isTyping: false,
      currentTaskIds: [],
      currentEventSources: [],
      attachments: [],
      _stopRequested: false,
      _historyTimeoutId: null,
    });
  },

  sendMessage: async (text: string) => {
    let { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, attachments, systemPrompt } = get();
    if (isTyping || (!text.trim() && attachments.length === 0)) return;

    set({
      isTyping: true,
      currentTaskIds: [],
      currentEventSources: [],
    });

    const userMsgId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    // Upload ALL attachments to server (images + files)
    const uploadedFiles: any[] = [];
    for (const att of attachments) {
      try {
        console.log('[UPLOAD] Uploading:', att.type, att.name, att.mimeType);
        const result = await chatService.uploadFile(att.uri, att.name, att.mimeType);
        console.log('[UPLOAD] Result:', JSON.stringify(result));
        if (result) {
          uploadedFiles.push({
            type: att.type === 'image' ? 'image' : 'file',
            localUri: att.uri,
            ...result,
          });
        }
      } catch (e) {
        console.error('Upload error:', e);
      }
    }

    const hasImages = uploadedFiles.some((f: any) => f.type === 'image');
    console.log('[PAYLOAD] uploadedFiles:', uploadedFiles.length, 'hasImages:', hasImages,
      'files:', uploadedFiles.map((f: any) => ({ type: f.type, id: f.id, name: f.name })));

    // Build display content with local URIs for images
    let messageContent: string | any[];
    if (uploadedFiles.length > 0) {
      const displayParts: any[] = [];
      for (const file of uploadedFiles) {
        if (file.type === 'image') {
          displayParts.push({ type: 'image_url', image_url: { url: file.localUri } });
        } else {
          displayParts.push({ type: 'text', text: `[Fichier joint: ${file.name}]` });
        }
      }
      displayParts.push({ type: 'text', text });
      messageContent = displayParts;
    } else {
      messageContent = text;
    }

    const newUserMsg: Message = { id: userMsgId, role: 'user', content: messageContent };

    set((state: any) => ({
      userMessages: [...state.userMessages, newUserMsg],
      attachments: [],
    }));

    if (!currentChatId) {
      try {
        const data = await chatService.createNewChat(activeModels[0], {
          id: userMsgId,
          content: typeof messageContent === 'string' ? messageContent : text,
        });
        currentChatId = data.id;
        set({ currentChatId });
      } catch (e) {
        console.error('Auto-create chat failed:', e);
      }
    }

    // Build API messages — plain text content
    const allUserMsgsNow = get().userMessages;
    const baseMessages = allUserMsgsNow.map((m: Message) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : getDisplayText(m.content),
    }));
    // Skip ADE system prompt when images are attached — it confuses vision models
    const effectiveSystemPrompt = hasImages
      ? (systemPrompt || 'Tu es un assistant utile.')
      : (systemPrompt ? `${systemPrompt}\n\n${ADE_SYSTEM_PROMPT}` : ADE_SYSTEM_PROMPT);
    const apiMessages = [{ role: 'system', content: effectiveSystemPrompt }, ...baseMessages];

    // Pre-generate stable assistant IDs for all (model x userMsg) combos
    // so concurrent stream callbacks all reference the same IDs
    const stableAssistantIds = new Map<string, string>();
    for (const um of get().userMessages) {
      for (const mn of activeModels) {
        stableAssistantIds.set(`${mn}::${um.id}`, generateUUID());
      }
    }

    // Shared stream state — plain object avoids race on primitive closure var
    const streamState = { count: activeModels.length, finalized: false };
    set({ _stopRequested: false });

    activeModels.forEach(async (modelName: string) => {
      let fullContent = '';
      const assistantMsgId = stableAssistantIds.get(`${modelName}::${userMsgId}`)!;

      // Force vision=true when images are attached so the server processes them
      const visionEnabled = hasImages || (get().modelVision[modelName] ?? false);
      const modelItem = buildModelItem(modelName, visionEnabled);

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: buildApiParams(get()),
        tool_servers: [],
        features: {
          voice: false,
          image_generation: false,
          code_interpreter: codeInterpreterEnabled,
          web_search: webSearchEnabled,
        },
        variables: {},
        model_item: modelItem,
        chat_id: currentChatId,
        id: assistantMsgId,
        parent_id: userMsgId,
        parent_message: {
          id: userMsgId,
          parentId: get().userMessages.length > 1
            ? get().userMessages[get().userMessages.length - 2]?.id || null
            : null,
          childrenIds: [assistantMsgId],
          role: 'user',
          content: text,
          timestamp,
          models: activeModels,
        },
        background_tasks: {
          title_generation: true,
          tags_generation: true,
          follow_up_generation: true,
        },
      };

      // ALL files at top-level (images + documents)
      if (uploadedFiles.length > 0) {
        streamPayload.files = uploadedFiles.map((f: any) => ({
          type: 'file', id: f.id, filename: f.name, meta: f.meta,
        }));
      }

      const es = await chatService.streamCompletion(
        streamPayload,
        (chunk: string, taskId?: string) => {
          fullContent += chunk;
          if (taskId) {
            set((state: any) => ({
              currentTaskIds: state.currentTaskIds.includes(taskId)
                ? state.currentTaskIds
                : [...state.currentTaskIds, taskId],
            }));
          }
          set((state: any) => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: {
                ...(state.modelResponses[modelName] || {}),
                [userMsgId]: fullContent,
              },
            },
          }));
        },
        (err: any) => {
          console.error(`Stream error (${modelName}):`, err);
          streamState.count--;
          if (streamState.count <= 0 && !streamState.finalized) {
            streamState.finalized = true;
            set({ isTyping: false });
          }
        }
      );

      set((state: any) => ({
        currentEventSources: [...state.currentEventSources, es],
      }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();

        // --- ADE loop: execute actions, re-stream, repeat if LLM emits more actions ---
        let adeIteration = 0;
        const adeConversation: { role: string; content: string }[] = [
          { role: 'system', content: effectiveSystemPrompt },
          ...baseMessages,
        ];

        while (adeIteration < ADE_MAX_ITERATIONS && fullContent) {
          if (get()._stopRequested) break;
          const adeRegex = /<<ADE:(\w+)\(([^)]*)\)>>/g;
          if (!adeRegex.test(fullContent)) break;

          adeIteration++;
          try {
            const { hasADE, processed: adeData } = await processADECalls(fullContent);
            if (!hasADE) break;

            // Show loading indicator
            set((state: any) => ({
              modelResponses: {
                ...state.modelResponses,
                [modelName]: {
                  ...(state.modelResponses[modelName] || {}),
                  [userMsgId]: '...',
                },
              },
            }));

            // Build conversation with ADE results
            adeConversation.push({ role: 'assistant', content: fullContent });
            adeConversation.push({
              role: 'user',
              content: `Résultats des actions ADE (iteration ${adeIteration}) :\n\n${adeData}\n\nAnalyse ces résultats. Si tu as besoin de plus d'info, utilise d'autres actions <<ADE:...>>. Sinon, reformule les données clairement en markdown sans mentionner les balises ADE.`,
            });

            let reformulated = '';
            const reformulatePayload = {
              model: modelName,
              messages: adeConversation,
              params: { temperature: 0.3, max_tokens: get().maxTokens },
              stream: true,
            };

            await new Promise<void>((resolve) => {
              chatService.streamCompletion(
                reformulatePayload,
                (chunk: string) => {
                  reformulated += chunk;
                  set((state: any) => ({
                    modelResponses: {
                      ...state.modelResponses,
                      [modelName]: {
                        ...(state.modelResponses[modelName] || {}),
                        [userMsgId]: reformulated,
                      },
                    },
                  }));
                },
                (err: any) => {
                  console.error('ADE reformulate error:', err);
                  reformulated = adeData;
                  set((state: any) => ({
                    modelResponses: {
                      ...state.modelResponses,
                      [modelName]: {
                        ...(state.modelResponses[modelName] || {}),
                        [userMsgId]: reformulated,
                      },
                    },
                  }));
                  resolve();
                },
              ).then((es2: any) => {
                const origClose2 = es2.close.bind(es2);
                es2.close = () => {
                  origClose2();
                  resolve();
                };
              });
            });

            fullContent = reformulated;
            // Loop continues — if reformulated contains more <<ADE:...>> tags, we process them
          } catch (adeErr) {
            console.error(`ADE loop error (iteration ${adeIteration}):`, adeErr);
            break;
          }
        }
        // --- Fin ADE loop ---

        streamState.count--;

        // Skip persistence if user pressed Stop
        if (!get()._stopRequested && currentChatId && fullContent) {
          try {
            const allUserMsgs = get().userMessages;
            const allModelResponses = get().modelResponses;
            const { historyMessages, messagesArray, lastMsgId } = buildHistoryPayload(
              allUserMsgs, allModelResponses, activeModels, stableAssistantIds, timestamp,
            );

            await chatService.updateChat(currentChatId, {
              chat: {
                models: activeModels,
                history: { messages: historyMessages, currentId: lastMsgId },
                messages: messagesArray,
                params: {},
                files: uploadedFiles.length > 0
                  ? uploadedFiles.map((f: any) => ({ id: f.id, type: f.type, name: f.name, url: f.url, meta: f.meta, mimeType: f.mimeType }))
                  : [],
              },
            });

            await chatService.chatCompleted({
              model: modelName,
              messages: [
                {
                  id: userMsgId,
                  role: 'user',
                  content: messageContent,
                  timestamp,
                },
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: fullContent,
                  timestamp,
                },
              ],
              model_item: modelItem,
              chat_id: currentChatId,
              session_id: '',
              id: assistantMsgId,
            });

            if (get().userMessages.length <= 1) {
              const apiMsgs = [
                { role: 'user' as const, content: messageContent },
                { role: 'assistant' as const, content: fullContent },
              ];
              chatService.generateTitle(currentChatId, modelName, apiMsgs)
                .then(() => get().fetchHistory())
                .catch((e: any) => console.error('Erreur titre:', e));
            }
          } catch (e) {
            console.error('Erreur persistence chat:', e);
          }
        }

        // finalized flag prevents double-execution if two streams close simultaneously
        if (streamState.count <= 0 && !streamState.finalized) {
          streamState.finalized = true;
          set({
            isTyping: false,
            currentEventSources: [],
            currentTaskIds: [],
          });
          get().fetchHistory();
          const tid = setTimeout(() => get().fetchHistory(), 3000);
          set({ _historyTimeoutId: tid });
        }
      };
    });
  },

  stopGeneration: async () => {
    const { currentEventSources, currentTaskIds } = get();
    // Set flag BEFORE closing so es.close callbacks skip persistence
    set({ _stopRequested: true, isTyping: false, currentTaskIds: [], currentEventSources: [] });
    currentEventSources.forEach((es: any) => {
      if (es && typeof es.close === 'function') {
        es.close();
      }
    });
    try {
      await Promise.all(currentTaskIds.map((id: string) => chatService.stopTask(id)));
    } catch (error) {
      console.warn("Erreur lors de l'arrêt des tâches serveur:", error);
    }
  },

  setCurrentChatId: async (chatId: string) => {
    set({
      currentChatId: chatId,
      userMessages: [],
      modelResponses: {},
      isTyping: true,
    });
    try {
      const data = await chatService.getChatDetails(chatId);
      const serverMessages = data.chat?.messages || [];
      const newUserMessages: Message[] = [];
      const newModelResponses: Record<string, Record<string, string>> = {};
      const modelsInChat = new Set<string>();

      serverMessages.forEach((msg: any) => {
        if (msg.role === 'user') {
          newUserMessages.push({ id: msg.id, role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
          const lastUser = newUserMessages[newUserMessages.length - 1];
          if (lastUser) {
            const mName = msg.model || 'athene-v2:latest';
            modelsInChat.add(mName);
            if (!newModelResponses[mName]) newModelResponses[mName] = {};
            newModelResponses[mName][lastUser.id] = typeof msg.content === 'string'
              ? msg.content
              : JSON.stringify(msg.content);
          }
        }
      });

      set({
        userMessages: newUserMessages,
        modelResponses: newModelResponses,
        activeModels: modelsInChat.size > 0 ? Array.from(modelsInChat) : get().activeModels,
        isTyping: false,
      });
    } catch (error) {
      console.error('Erreur chargement détails chat:', error);
      set({ isTyping: false });
    }
  },

  regenerateResponse: async (userMsgId: string) => {
    const { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, systemPrompt, maxTokens } = get();
    if (isTyping) return;

    const newModelResponses = { ...get().modelResponses };
    for (const mn of activeModels) {
      if (newModelResponses[mn]?.[userMsgId]) {
        newModelResponses[mn] = { ...newModelResponses[mn] };
        delete newModelResponses[mn][userMsgId];
      }
    }

    set({
      isTyping: true,
      modelResponses: newModelResponses,
      currentTaskIds: [],
      currentEventSources: [],
    });

    const allUserMsgs = get().userMessages;
    const msgIndex = allUserMsgs.findIndex((m: Message) => m.id === userMsgId);
    if (msgIndex === -1) { set({ isTyping: false }); return; }

    const relevantMsgs = allUserMsgs.slice(0, msgIndex + 1);
    const baseMsgs = relevantMsgs.map((m: Message) => ({ role: m.role, content: m.content }));
    const apiMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...baseMsgs]
      : baseMsgs;
    const userMsg = allUserMsgs[msgIndex];
    const userContent = typeof userMsg.content === 'string' ? userMsg.content : JSON.stringify(userMsg.content);
    const timestamp = Math.floor(Date.now() / 1000);

    // Pre-generate stable IDs for all (model x userMsg) combos
    const regenStableIds = new Map<string, string>();
    for (const um of allUserMsgs) {
      for (const mn of activeModels) {
        regenStableIds.set(`${mn}::${um.id}`, generateUUID());
      }
    }

    const regenStreamState = { count: activeModels.length, finalized: false };

    activeModels.forEach(async (modelName: string) => {
      let fullContent = '';
      const assistantMsgId = regenStableIds.get(`${modelName}::${userMsgId}`)!;

      const modelItem = buildModelItem(modelName, get().modelVision[modelName] ?? false);

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: buildApiParams(get()),
        tool_servers: [],
        features: { voice: false, image_generation: false, code_interpreter: codeInterpreterEnabled, web_search: webSearchEnabled },
        variables: {},
        model_item: modelItem,
        chat_id: currentChatId,
        id: assistantMsgId,
        parent_id: userMsgId,
      };

      const es = await chatService.streamCompletion(
        streamPayload,
        (chunk: string, taskId?: string) => {
          fullContent += chunk;
          if (taskId) {
            set((state: any) => ({ currentTaskIds: state.currentTaskIds.includes(taskId) ? state.currentTaskIds : [...state.currentTaskIds, taskId] }));
          }
          set((state: any) => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: { ...(state.modelResponses[modelName] || {}), [userMsgId]: fullContent },
            },
          }));
        },
        (err: any) => {
          console.error(`Regenerate stream error (${modelName}):`, err);
          regenStreamState.count--;
          if (regenStreamState.count <= 0 && !regenStreamState.finalized) {
            regenStreamState.finalized = true;
            set({ isTyping: false });
          }
        }
      );

      set((state: any) => ({ currentEventSources: [...state.currentEventSources, es] }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();
        regenStreamState.count--;

        if (!get()._stopRequested && currentChatId && fullContent) {
          try {
            const allMsgs = get().userMessages;
            const allResp = get().modelResponses;
            const { historyMessages, messagesArray, lastMsgId } = buildHistoryPayload(
              allMsgs, allResp, activeModels, regenStableIds, timestamp,
            );

            await chatService.updateChat(currentChatId, {
              chat: { models: activeModels, history: { messages: historyMessages, currentId: lastMsgId }, messages: messagesArray, params: {}, files: [] },
            });

            await chatService.chatCompleted({
              model: modelName,
              messages: [
                { id: userMsgId, role: 'user', content: userContent, timestamp },
                { id: assistantMsgId, role: 'assistant', content: fullContent, timestamp },
              ],
              model_item: modelItem,
              chat_id: currentChatId,
              session_id: '',
              id: assistantMsgId,
            });
          } catch (e) {
            console.error('Erreur persistence regenerate:', e);
          }
        }

        if (regenStreamState.count <= 0 && !regenStreamState.finalized) {
          regenStreamState.finalized = true;
          set({ isTyping: false, currentEventSources: [], currentTaskIds: [] });
          get().fetchHistory();
        }
      };
    });
  },

  editAndResend: async (userMsgId: string, newContent: string) => {
    const { userMessages, modelResponses, activeModels } = get();
    const msgIndex = userMessages.findIndex((m: Message) => m.id === userMsgId);
    if (msgIndex === -1) return;

    const truncatedMsgs = userMessages.slice(0, msgIndex + 1).map((m: Message) =>
      m.id === userMsgId ? { ...m, content: newContent } : m
    );

    const truncatedIds = new Set(truncatedMsgs.map((m: Message) => m.id));
    const newModelResponses: Record<string, Record<string, string>> = {};
    for (const mn of activeModels) {
      if (modelResponses[mn]) {
        newModelResponses[mn] = {};
        for (const [key, val] of Object.entries(modelResponses[mn])) {
          if (truncatedIds.has(key) && key !== userMsgId) {
            newModelResponses[mn][key] = val as string;
          }
        }
      }
    }

    set({
      userMessages: truncatedMsgs,
      modelResponses: newModelResponses,
    });

    await get().regenerateResponse(userMsgId);
  },
});
