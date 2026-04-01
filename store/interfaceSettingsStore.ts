import {create} from 'zustand';
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingOption {
  textKey: string;
  type: 'separator' | 'NumberInput' | 'switch' | 'action-sheet' | 'PLACEHOLDER';
  value: any;
  validValues?: string[];
}


interface InterfaceSettingsState {
  optionsList: Record<string, SettingOption>;
  setOptionValue: (id: string, newValue: any) => void;
}

const initialOptionsList: Record<string, SettingOption> = {
  '0': { textKey: 'iface_sep_ui', type: 'separator', value: null },
  '1': { textKey: 'iface_ui_scale', type: 'NumberInput', value: 100 },
  '2': { textKey: 'iface_high_contrast', type: 'switch', value: false },
  '3': { textKey: 'iface_allow_location', type: 'switch', value: false },
  '4': { textKey: 'iface_haptic', type: 'switch', value: true },
  '5': { textKey: 'iface_copyisformatted', type: 'switch', value: false },
  '6': { textKey: 'iface_sep_chat', type: 'separator', value: null },
  '7': { textKey: 'iface_chatdirection', type: 'action-sheet', value: 'LTR', validValues: ['LTR', 'RTL'] },
  '8': { textKey: 'iface_chatbackgroundimage', type: 'PLACEHOLDER', value: 'TODO' },
  '9': { textKey: 'iface_chat_bubble_ui', type: 'switch', value: true }, //TODO what does this do?
  '10': { textKey: 'iface_default_is_temporary', type: 'switch', value: false },
  '11': { textKey: 'iface_fade_effect', type: 'switch', value: false },
  '12': { textKey: 'iface_title_gen', type: 'switch', value: true },
  '13': { textKey: 'iface_followup_gen', type: 'switch', value: true },
  '14': { textKey: 'iface_chat_tags_gen', type: 'switch', value: true },
  '15': { textKey: 'iface_autocopy_response', type: 'switch', value: false },
  '16': { textKey: 'iface_insert_suggestion_to_input', type: 'switch', value: false }, //TODO What does this do?
  '17': { textKey: 'iface_keep_followup_chat', type: 'switch', value: false },
  '18': { textKey: 'iface_insert_followup_input', type: 'switch', value: false },
  '19': { textKey: 'iface_regen_menu', type: 'switch', value: true },
  '20': { textKey: 'iface_collapse_code', type: 'switch', value: false },
  '21': { textKey: 'iface_collapse_details', type: 'switch', value: true },
  '22': { textKey: 'iface_scroll_on_branch_change', type: 'switch', value: true },
  '23': { textKey: 'iface_pdf_export_has_style', type: 'switch', value: true },
  '24': { textKey: 'iface_quick_actions', type: 'switch', value: true },
  '25': { textKey: 'iface_web_search_always', type: 'switch', value: false },
  '26': { textKey: 'iface_sep_input', type: 'separator', value: null },
  '27': { textKey: 'iface_enter_is_send', type: 'switch', value: false },
  '28': { textKey: 'iface_rich_text_input', type: 'switch', value: true },
  '29': { textKey: 'iface_prompt_autocomplete', type: 'switch', value: false },
  '30': { textKey: 'iface_show_formatting_toolbar', type: 'switch', value: false },
  '31': { textKey: 'iface_insert_prompt_is_rich', type: 'switch', value: false },
  '32': { textKey: 'iface_paste_large_text_as_file', type: 'switch', value: false },
  '33': { textKey: 'iface_sep_artifact', type: 'separator', value: null },
  '34': { textKey: 'iface_auto_detect_artefacts', type: 'switch', value: true },
  '35': { textKey: 'iface_sep_voice', type: 'separator', value: null },
  '36': { textKey: 'iface_voice_interrupt_in_call', type: 'switch', value: false },
  '37': { textKey: 'iface_emoji_in_call', type: 'switch', value: false },
  '38': { textKey: 'iface_sep_image', type: 'separator', value: null },
  '39': { textKey: 'iface_image_compression', type: 'switch', value: false }
};

const useInterfaceSettingsStore = create<InterfaceSettingsState>()(
    persist(
        (set) => ({
             optionsList: initialOptionsList,
             setOptionsList: (id, newValue) => {
                set((state) => ({
                    optionsList: {
                        ...state.optionsList,
                        [id]: {
                            ...state.optionsList[id],
                            value: newValue,
                        },
                    },
                })
                )
             }}),
             {
                name: "interface-settings-store",
                storage: createJSONStorage(() => AsyncStorage),
            }
    )
);

export default useInterfaceSettingsStore;