/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { Attachment } from '../../utils/messageHelpers';

/** All LLM generation parameters (null = not sent / use server default) */
export interface LLMParams {
  temperature: number;
  maxTokens: number;
  topK: number;
  topP: number;
  minP: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  repeatPenalty: number | null;
  repeatLastN: number | null;
  mirostat: number | null;       // 0=off, 1=mirostat, 2=mirostat2
  mirostatEta: number | null;
  mirostatTau: number | null;
  tfsZ: number | null;
  seed: number | null;
  stop: string | null;           // comma-separated stop sequences
  numCtx: number | null;
  numBatch: number | null;
  numKeep: number | null;
  think: boolean;                // Ollama think mode
  streamResponse: boolean;
}

export interface SettingsSlice extends LLMParams {
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  setParam: <K extends keyof LLMParams>(key: K, value: LLMParams[K]) => void;
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
  // Legacy setters (keep for existing callers)
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;
  setTopK: (v: number) => void;
  setTopP: (v: number) => void;
}

const DEFAULT_PARAMS: LLMParams = {
  temperature: 0.7,
  maxTokens: 2048,
  topK: 40,
  topP: 0.9,
  minP: null,
  frequencyPenalty: null,
  presencePenalty: null,
  repeatPenalty: null,
  repeatLastN: null,
  mirostat: null,
  mirostatEta: null,
  mirostatTau: null,
  tfsZ: null,
  seed: null,
  stop: null,
  numCtx: null,
  numBatch: null,
  numKeep: null,
  think: false,
  streamResponse: true,
};

export const createSettingsSlice = (set: any, get: any): SettingsSlice => ({
  systemPrompt: '',
  ...DEFAULT_PARAMS,
  attachments: [],
  modelVision: {},
  webSearchEnabled: false,
  codeInterpreterEnabled: false,

  setSystemPrompt: (v) => set({ systemPrompt: v }),
  setParam: (key, value) => set({ [key]: value }),

  // Legacy setters
  setTemperature: (v) => set({ temperature: v }),
  setMaxTokens: (v) => set({ maxTokens: v }),
  setTopK: (v) => set({ topK: v }),
  setTopP: (v) => set({ topP: v }),

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
