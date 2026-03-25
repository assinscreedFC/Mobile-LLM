/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { generateUUID } from './uuid';

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

export function buildModelItem(modelName: string, visionEnabled: boolean) {
  return {
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
          vision: visionEnabled,
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
}

export function buildHistoryPayload(
  allUserMsgs: Message[],
  allModelResponses: Record<string, Record<string, string>>,
  activeModels: string[],
  stableIds: Map<string, string>,
  timestamp: number,
) {
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
        const aId = stableIds.get(`${mn}::${um.id}`) ?? generateUUID();
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

  return { historyMessages, messagesArray, lastMsgId };
}

export function buildConversation(
  userMessages: Message[],
  modelResponses: Record<string, string>,
  modelName: string,
): Message[] {
  const conversation: Message[] = [];
  for (const userMsg of userMessages) {
    conversation.push(userMsg);
    const aiResponse = modelResponses[userMsg.id];
    if (aiResponse) {
      conversation.push({ id: `${modelName}-${userMsg.id}`, role: 'assistant', content: aiResponse });
    }
  }
  return conversation;
}

export function getDisplayText(content: string | any[]): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n');
  }
  return String(content);
}
