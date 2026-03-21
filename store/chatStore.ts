/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { create } from 'zustand';
import { chatService } from '../services/chatService';
import { adeService } from '../services/adeService';
import { generateUUID } from '../utils/uuid';

// --- ADE System Prompt ---
const ADE_SYSTEM_PROMPT = `Tu as accès au système ADE Consult (emploi du temps universitaire Paris Cité).
Tu peux naviguer dans l'interface ADE de manière autonome via des actions.

Pour appeler une action, écris une balise sur une ligne seule :
<<ADE:action(param1=valeur1,param2=valeur2)>>

Actions disponibles :
- <<ADE:browse()>> : Liste les noeuds visibles de l'arbre (catégories, formations, salles...)
- <<ADE:expand(node=nom)>> : Ouvre un dossier de l'arbre pour voir son contenu (match partiel)
- <<ADE:select(node=nom)>> : Sélectionne/coche un élément pour afficher son planning (match partiel)
- <<ADE:search(query=texte)>> : Recherche dans ADE (formations, salles, profs...)
- <<ADE:read()>> : Lit le contenu affiché (emploi du temps, événements)
- <<ADE:status()>> : Vérifie la connexion ADE

Workflow typique pour obtenir un emploi du temps :
1. <<ADE:search(query=L3 informatique)>> — chercher la formation
2. Analyser les résultats retournés
3. <<ADE:select(node=L3 Informatique)>> — sélectionner le bon noeud
4. <<ADE:read()>> — lire l'emploi du temps affiché

Ou pour explorer l'arbre :
1. <<ADE:browse()>> — voir les catégories
2. <<ADE:expand(node=Formations)>> — ouvrir le dossier
3. <<ADE:expand(node=Licence)>> — descendre dans l'arbre
4. <<ADE:select(node=L3 Info)>> — sélectionner
5. <<ADE:read()>> — lire le planning

Règles :
- N'invente JAMAIS de données. Utilise les actions ADE pour les obtenir.
- Tu peux enchainer plusieurs actions dans une seule réponse.
- Si l'utilisateur n'est pas connecté, dis-lui d'aller dans Paramètres > ADE Consult.
- Si la demande ne concerne PAS l'emploi du temps, réponds normalement.
- Utilise le match partiel : <<ADE:select(node=informatique)>> trouvera "L3 Informatique".
- Si après plusieurs tentatives (search, browse, expand) tu ne trouves pas la formation ou la ressource, DEMANDE à l'utilisateur le nom exact de sa formation, son département ou son groupe. Ne boucle pas indéfiniment.`;

const ADE_MAX_ITERATIONS = 5;

function parseADEParams(raw: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!raw || raw.trim() === '') return params;
  for (const part of raw.split(',')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return params;
}

async function executeADECall(action: string, params: Record<string, string>): Promise<string> {
  try {
    if (action === 'status') {
      const s = await adeService.getStatus();
      return `[ADE] Connecté: ${s.authenticated}, Credentials: ${s.has_credentials}, Projet: ${s.project_id ?? 'aucun'}, Ressources: ${s.resources_count}`;
    }
    // Toutes les autres actions passent par adeService.adeAction
    const result = await adeService.adeAction(action, params);
    return `[ADE] ${JSON.stringify(result)}`;
  } catch (error: any) {
    const msg = error?.response?.data?.detail || error?.message || 'Erreur inconnue';
    return `[ADE] Erreur : ${msg}`;
  }
}

async function processADECalls(text: string): Promise<{ hasADE: boolean; processed: string }> {
  const regex = /<<ADE:(\w+)\(([^)]*)\)>>/g;
  const calls: { fullMatch: string; action: string; rawParams: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    calls.push({ fullMatch: match[0], action: match[1], rawParams: match[2] });
  }
  if (calls.length === 0) return { hasADE: false, processed: text };

  let processed = text;
  for (const call of calls) {
    const params = parseADEParams(call.rawParams);
    const result = await executeADECall(call.action, params);
    processed = processed.replace(call.fullMatch, result);
  }
  return { hasADE: true, processed };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: any; // Accepte texte ou structure complexe (image, etc.)
}

export interface Attachment {
  id?: string;
  type: 'image' | 'file';
  uri: string;
  name?: string;
  mimeType?: string;
  base64?: string;
}

interface ChatState {
  currentChatId: string | null;
  userMessages: Message[];
  modelResponses: Record<string, Record<string, string>>;
  activeModels: string[];
  isTyping: boolean;
  webSearchEnabled: boolean;
  codeInterpreterEnabled: boolean;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  setSystemPrompt: (v: string) => void;
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;
  attachments: Attachment[];
  addAttachment: (att: Attachment) => void;
  removeAttachment: (uri: string) => void;
  clearAttachments: () => void;
  modelVision: Record<string, boolean>;
  setModelVision: (modelName: string, vision: boolean) => void;
  setWebSearchEnabled: (v: boolean) => void;
  setCodeInterpreterEnabled: (v: boolean) => void;
  addModel: (name: string) => void;
  switchModel: (index: number, newModel: string) => void;
  startNewChat: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  history: any[];
  fetchHistory: () => Promise<void>;
  currentTaskIds: string[];
  currentEventSources: any[];
  stopGeneration: () => Promise<void>;
  setCurrentChatId: (chatId: string) => Promise<void>;
  regenerateResponse: (userMsgId: string) => Promise<void>;
  editAndResend: (userMsgId: string, newContent: string) => Promise<void>;
  _stopRequested: boolean;
  _historyTimeoutId: ReturnType<typeof setTimeout> | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentChatId: null,
  userMessages: [],
  modelResponses: {},
  activeModels: ['athene-v2:latest'],
  isTyping: false,
  webSearchEnabled: false,
  codeInterpreterEnabled: false,
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  currentTaskIds: [],
  currentEventSources: [],
  attachments: [],
  _stopRequested: false,
  _historyTimeoutId: null,

  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setTemperature: (v) => set({ temperature: v }),
  setMaxTokens: (v) => set({ maxTokens: v }),

  addAttachment: (att) => set(state => ({ attachments: [...state.attachments, att] })),
  removeAttachment: (uri) => set(state => ({
    attachments: state.attachments.filter(a => a.uri !== uri)
  })),
  clearAttachments: () => set({ attachments: [] }),

  modelVision: {},
  setModelVision: (modelName, vision) => set(state => ({
    modelVision: { ...state.modelVision, [modelName]: vision }
  })),

  setWebSearchEnabled: (value) => set({ webSearchEnabled: value }),
  setCodeInterpreterEnabled: (value) => set({ codeInterpreterEnabled: value }),

  addModel: (modelName) => {
    const { activeModels } = get();
    if (activeModels.length < 4 && !activeModels.includes(modelName)) {
      set({ activeModels: [...activeModels, modelName] });
    }
  },

  switchModel: (index: number, newModel: string) => {
    const { activeModels, modelResponses } = get();
    if (index >= 0 && index < activeModels.length) {
      const oldModel = activeModels[index];
      const updated = [...activeModels];
      updated[index] = newModel;

      const newModelResponses = { ...modelResponses };
      if (oldModel !== newModel) {
        if (newModelResponses[oldModel] && !newModelResponses[newModel]) {
          newModelResponses[newModel] = { ...newModelResponses[oldModel] };
        }
      }

      set({ activeModels: updated, modelResponses: newModelResponses });
    }
  },

  history: [],

  fetchHistory: async () => {
    try {
      const data = await chatService.getHistory(1);
      const list = Array.isArray(data) ? data : [];
      set({ history: list });
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  },

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
    let { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, attachments, systemPrompt, temperature, maxTokens } = get();
    if (isTyping || (!text.trim() && attachments.length === 0)) return;

    set({
      isTyping: true,
      currentTaskIds: [],
      currentEventSources: [],
    });

    const userMsgId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const uploadedFiles: any[] = [];
    for (const att of attachments) {
      try {
        const result = await chatService.uploadFile(att.uri, att.name, att.mimeType);
        if (result) {
          uploadedFiles.push({ type: att.type === 'image' ? 'image' : 'file', ...result });
        }
      } catch (e) {
        console.error('Upload error:', e);
      }
    }

    let messageContent: string | any[];
    if (uploadedFiles.length > 0) {
      const contentParts: any[] = [];
      for (const file of uploadedFiles) {
        if (file.type === 'image') {
          contentParts.push({ type: 'image_url', image_url: { url: file.url || file.path } });
        } else {
          contentParts.push({ type: 'text', text: `[Fichier joint: ${file.name}]` });
        }
      }
      contentParts.push({ type: 'text', text });
      messageContent = contentParts;
    } else {
      messageContent = text;
    }

    const newUserMsg: Message = { id: userMsgId, role: 'user', content: messageContent };

    set(state => ({
      userMessages: [...state.userMessages, newUserMsg],
      attachments: [],
    }));

    if (!currentChatId) {
      try {
        const contentStr = typeof messageContent === 'string' ? messageContent : text;
        const data = await chatService.createNewChat(activeModels[0], {
          id: userMsgId,
          content: contentStr,
        });
        currentChatId = data.id;
        set({ currentChatId });
      } catch (e) {
        console.error('Auto-create chat failed:', e);
      }
    }

    const baseMessages = get().userMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    const adePrompt = systemPrompt
      ? `${systemPrompt}\n\n${ADE_SYSTEM_PROMPT}`
      : ADE_SYSTEM_PROMPT;
    const apiMessages = [{ role: 'system', content: adePrompt }, ...baseMessages];

    // Pre-generate stable assistant IDs for all (model × userMsg) combos
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

    activeModels.forEach(async (modelName) => {
      let fullContent = '';
      const assistantMsgId = stableAssistantIds.get(`${modelName}::${userMsgId}`)!;

      const modelItem = {
        id: modelName,
        name: modelName,
        object: 'model',
        connection_type: 'local',
        tags: [],
        info: {
          id: modelName,
          name: modelName,
          meta: {
            capabilities: {
              vision: get().modelVision[modelName] ?? false,
              file_upload: true,
              web_search: true,
              image_generation: true,
              code_interpreter: true,
              citations: true,
            },
          },
        },
        actions: [],
        filters: [],
      };

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: { temperature, max_tokens: maxTokens },
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
          content: typeof messageContent === 'string' ? messageContent : text,
          timestamp,
          models: activeModels,
        },
        background_tasks: {
          title_generation: true,
          tags_generation: true,
          follow_up_generation: true,
        },
      };

      if (uploadedFiles.length > 0) {
        streamPayload.files = uploadedFiles.map(f => ({
          type: 'file',
          id: f.id,
          filename: f.name,
          meta: f.meta,
        }));
      }

      const es = await chatService.streamCompletion(
        streamPayload,
        (chunk, taskId) => {
          fullContent += chunk;
          if (taskId) {
            set(state => ({
              currentTaskIds: state.currentTaskIds.includes(taskId)
                ? state.currentTaskIds
                : [...state.currentTaskIds, taskId],
            }));
          }
          set(state => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: {
                ...(state.modelResponses[modelName] || {}),
                [userMsgId]: fullContent,
              },
            },
          }));
        },
        (err) => {
          console.error(`Stream error (${modelName}):`, err);
          streamState.count--;
          if (streamState.count <= 0 && !streamState.finalized) {
            streamState.finalized = true;
            set({ isTyping: false });
          }
        }
      );

      set(state => ({
        currentEventSources: [...state.currentEventSources, es],
      }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();

        // --- ADE loop: execute actions, re-stream, repeat if LLM emits more actions ---
        let adeIteration = 0;
        const adeConversation: { role: string; content: string }[] = [
          { role: 'system', content: adePrompt },
          ...baseMessages,
        ];

        while (adeIteration < ADE_MAX_ITERATIONS && fullContent) {
          const adeRegex = /<<ADE:(\w+)\(([^)]*)\)>>/g;
          if (!adeRegex.test(fullContent)) break;

          adeIteration++;
          try {
            const { hasADE, processed: adeData } = await processADECalls(fullContent);
            if (!hasADE) break;

            // Show loading indicator
            set(state => ({
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
              params: { temperature: 0.3, max_tokens: maxTokens },
              stream: true,
            };

            await new Promise<void>((resolve) => {
              chatService.streamCompletion(
                reformulatePayload,
                (chunk) => {
                  reformulated += chunk;
                  set(state => ({
                    modelResponses: {
                      ...state.modelResponses,
                      [modelName]: {
                        ...(state.modelResponses[modelName] || {}),
                        [userMsgId]: reformulated,
                      },
                    },
                  }));
                },
                (err) => {
                  console.error('ADE reformulate error:', err);
                  reformulated = adeData;
                  set(state => ({
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
              ).then((es2) => {
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
            const historyMessages: Record<string, any> = {};
            const messagesArray: any[] = [];

            let prevMsgId: string | null = null;
            for (const um of allUserMsgs) {
              const umObj: any = {
                id: um.id,
                parentId: prevMsgId,
                childrenIds: [],
                role: 'user',
                content: typeof um.content === 'string' ? um.content : JSON.stringify(um.content),
                timestamp,
                models: activeModels,
              };

              const responseIds: string[] = [];
              for (const mn of activeModels) {
                if (allModelResponses[mn]?.[um.id]) {
                  // Use stable pre-generated IDs — avoids UUID churn across concurrent closes
                  const aId = stableAssistantIds.get(`${mn}::${um.id}`) ?? generateUUID();
                  responseIds.push(aId);

                  const aObj: any = {
                    parentId: um.id,
                    id: aId,
                    childrenIds: [],
                    role: 'assistant',
                    content: allModelResponses[mn][um.id],
                    model: mn,
                    modelName: mn,
                    modelIdx: activeModels.indexOf(mn),
                    timestamp,
                  };
                  historyMessages[aId] = aObj;
                  messagesArray.push(aObj);
                  prevMsgId = aId;
                }
              }

              umObj.childrenIds = responseIds;
              historyMessages[um.id] = umObj;
              messagesArray.splice(messagesArray.length - responseIds.length, 0, umObj);
            }

            const lastMsgId = messagesArray.length > 0
              ? messagesArray[messagesArray.length - 1].id
              : null;

            await chatService.updateChat(currentChatId, {
              chat: {
                models: activeModels,
                history: {
                  messages: historyMessages,
                  currentId: lastMsgId,
                },
                messages: messagesArray,
                params: {},
                files: uploadedFiles.length > 0 ? uploadedFiles : [],
              },
            });

            await chatService.chatCompleted({
              model: modelName,
              messages: [
                {
                  id: userMsgId,
                  role: 'user',
                  content: typeof messageContent === 'string' ? messageContent : text,
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
                { role: 'user' as const, content: typeof messageContent === 'string' ? messageContent : text },
                { role: 'assistant' as const, content: fullContent },
              ];
              chatService.generateTitle(currentChatId, modelName, apiMsgs)
                .then(() => get().fetchHistory())
                .catch(e => console.error('Erreur titre:', e));
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
    currentEventSources.forEach(es => {
      if (es && typeof es.close === 'function') {
        es.close();
      }
    });
    try {
      await Promise.all(currentTaskIds.map(id => chatService.stopTask(id)));
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
    const { isTyping, activeModels, currentChatId, webSearchEnabled, codeInterpreterEnabled, systemPrompt, temperature, maxTokens } = get();
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
    const msgIndex = allUserMsgs.findIndex(m => m.id === userMsgId);
    if (msgIndex === -1) { set({ isTyping: false }); return; }

    const relevantMsgs = allUserMsgs.slice(0, msgIndex + 1);
    const baseMsgs = relevantMsgs.map(m => ({ role: m.role, content: m.content }));
    const apiMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...baseMsgs]
      : baseMsgs;
    const userMsg = allUserMsgs[msgIndex];
    const userContent = typeof userMsg.content === 'string' ? userMsg.content : JSON.stringify(userMsg.content);
    const timestamp = Math.floor(Date.now() / 1000);

    // Pre-generate stable IDs for all (model × userMsg) combos
    const regenStableIds = new Map<string, string>();
    for (const um of allUserMsgs) {
      for (const mn of activeModels) {
        regenStableIds.set(`${mn}::${um.id}`, generateUUID());
      }
    }

    const regenStreamState = { count: activeModels.length, finalized: false };

    activeModels.forEach(async (modelName) => {
      let fullContent = '';
      const assistantMsgId = regenStableIds.get(`${modelName}::${userMsgId}`)!;

      const modelItem = {
        id: modelName, name: modelName, object: 'model',
        connection_type: 'local', tags: [],
        info: { id: modelName, name: modelName, meta: { capabilities: { vision: get().modelVision[modelName] ?? false, file_upload: true, web_search: true, image_generation: true, code_interpreter: true, citations: true } } },
        actions: [], filters: [],
      };

      const streamPayload: any = {
        model: modelName,
        messages: apiMessages,
        params: { temperature, max_tokens: maxTokens },
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
        (chunk, taskId) => {
          fullContent += chunk;
          if (taskId) {
            set(state => ({ currentTaskIds: state.currentTaskIds.includes(taskId) ? state.currentTaskIds : [...state.currentTaskIds, taskId] }));
          }
          set(state => ({
            modelResponses: {
              ...state.modelResponses,
              [modelName]: { ...(state.modelResponses[modelName] || {}), [userMsgId]: fullContent },
            },
          }));
        },
        (err) => {
          console.error(`Regenerate stream error (${modelName}):`, err);
          regenStreamState.count--;
          if (regenStreamState.count <= 0 && !regenStreamState.finalized) {
            regenStreamState.finalized = true;
            set({ isTyping: false });
          }
        }
      );

      set(state => ({ currentEventSources: [...state.currentEventSources, es] }));

      const originalClose = es.close.bind(es);
      es.close = async () => {
        originalClose();
        regenStreamState.count--;

        if (!get()._stopRequested && currentChatId && fullContent) {
          try {
            const allMsgs = get().userMessages;
            const allResp = get().modelResponses;
            const historyMessages: Record<string, any> = {};
            const messagesArray: any[] = [];
            let prevMsgId: string | null = null;

            for (const um of allMsgs) {
              const umObj: any = { id: um.id, parentId: prevMsgId, childrenIds: [], role: 'user', content: typeof um.content === 'string' ? um.content : JSON.stringify(um.content), timestamp, models: activeModels };
              const responseIds: string[] = [];
              for (const mn of activeModels) {
                if (allResp[mn]?.[um.id]) {
                  const aId = regenStableIds.get(`${mn}::${um.id}`) ?? generateUUID();
                  responseIds.push(aId);
                  const aObj: any = { parentId: um.id, id: aId, childrenIds: [], role: 'assistant', content: allResp[mn][um.id], model: mn, modelName: mn, modelIdx: activeModels.indexOf(mn), timestamp };
                  historyMessages[aId] = aObj;
                  messagesArray.push(aObj);
                  prevMsgId = aId;
                }
              }
              umObj.childrenIds = responseIds;
              historyMessages[um.id] = umObj;
              messagesArray.splice(messagesArray.length - responseIds.length, 0, umObj);
            }

            const lastMsgId = messagesArray.length > 0 ? messagesArray[messagesArray.length - 1].id : null;
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
    const msgIndex = userMessages.findIndex(m => m.id === userMsgId);
    if (msgIndex === -1) return;

    const truncatedMsgs = userMessages.slice(0, msgIndex + 1).map(m =>
      m.id === userMsgId ? { ...m, content: newContent } : m
    );

    const truncatedIds = new Set(truncatedMsgs.map(m => m.id));
    const newModelResponses: Record<string, Record<string, string>> = {};
    for (const mn of activeModels) {
      if (modelResponses[mn]) {
        newModelResponses[mn] = {};
        for (const [key, val] of Object.entries(modelResponses[mn])) {
          if (truncatedIds.has(key) && key !== userMsgId) {
            newModelResponses[mn][key] = val;
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
}));