


import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "systeme" | "clair" | "sombre";
export type Language = "systeme" | "zh" | "en" | "fr";

type SettingsState = {
  themeMode: ThemeMode;
  language: Language;
  notificationsEnabled: boolean;

  setThemeMode: (v: ThemeMode) => void;
  setLanguage: (v: Language) => void;
  setNotificationsEnabled: (v: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: "systeme",
      language: "systeme",
      notificationsEnabled: false,

      setThemeMode: (themeMode) => set({ themeMode }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
    }),
    {
      name: "l3t1-settings-v1",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
