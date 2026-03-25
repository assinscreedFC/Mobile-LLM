/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { Attachment } from '../../utils/messageHelpers';

export interface SettingsSlice {
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
  webSearchEnabled: boolean;
  codeInterpreterEnabled: boolean;
  setWebSearchEnabled: (v: boolean) => void;
  setCodeInterpreterEnabled: (v: boolean) => void;
  addModel: (name: string) => void;
  switchModel: (index: number, newModel: string) => void;
}

export const createSettingsSlice = (set: any, get: any): SettingsSlice => ({
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 2048,
  attachments: [],
  modelVision: {},
  webSearchEnabled: false,
  codeInterpreterEnabled: false,

  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setTemperature: (v) => set({ temperature: v }),
  setMaxTokens: (v) => set({ maxTokens: v }),

  addAttachment: (att) => set((state: any) => ({ attachments: [...state.attachments, att] })),
  removeAttachment: (uri) => set((state: any) => ({
    attachments: state.attachments.filter((a: Attachment) => a.uri !== uri)
  })),
  clearAttachments: () => set({ attachments: [] }),

  setModelVision: (modelName, vision) => set((state: any) => ({
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
});
