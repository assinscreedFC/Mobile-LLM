import React, { useEffect } from "react";
import i18n from "../i18n/i18n";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Localization from "expo-localization";
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";

export default function RootLayout() {
  const { themeMode, language } = useSettingsStore();

  const { resolved, colors } = useResolvedTheme(themeMode);

  useEffect(() => {
    const supported = ["fr", "en", "zh"];

    if (language === "system") {
      const deviceLang = Localization.locale.split("-")[0];
      const finalLang = supported.includes(deviceLang)
        ? deviceLang
        : "fr";

      i18n.changeLanguage(finalLang);
    } else {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <SafeAreaProvider>
      <StatusBar
        style={resolved === "dark" ? "light" : "dark"}
        backgroundColor={colors.bg}
      />
      <ActionSheetProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </ActionSheetProvider>
    </SafeAreaProvider>
  );
}
