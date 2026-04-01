import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import * as Localization from "expo-localization";
import { ChevronLeft, ChevronRight, Check } from "lucide-react-native";
import { useRouter } from "expo-router";

import { resources, type TranslationKey } from "../i18n/translations";
import { useSettingsStore, type Language } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";

function resolvePreviewLanguage(language: Language) {
  if (language !== "systeme") return language;

  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  return deviceLanguage === "fr" || deviceLanguage === "zh" ? deviceLanguage : "en";
}

export default function General() {
  const router = useRouter();
  const {
    themeMode,
    language,
    notificationsEnabled,
    setThemeMode,
    setLanguage,
    setNotificationsEnabled,
  } = useSettingsStore();

  const [draftThemeMode, setDraftThemeMode] = useState(themeMode);
  const [draftLanguage, setDraftLanguage] = useState(language);
  const [draftNotificationsEnabled, setDraftNotificationsEnabled] =
    useState(notificationsEnabled);
  const [isDirty, setIsDirty] = useState(false);
  const [themeVisible, setThemeVisible] = useState(false);
  const [langVisible, setLangVisible] = useState(false);

  useEffect(() => {
    if (isDirty) return;

    setDraftThemeMode(themeMode);
    setDraftLanguage(language);
    setDraftNotificationsEnabled(notificationsEnabled);
  }, [themeMode, language, notificationsEnabled, isDirty]);

  const previewLanguage = useMemo(
    () => resolvePreviewLanguage(draftLanguage),
    [draftLanguage]
  );

  const previewTranslations = useMemo(
    () => resources[previewLanguage].translation as Record<string, string>,
    [previewLanguage]
  );

  const t = (key: TranslationKey) => {
    return previewTranslations[key] ?? resources.en.translation[key] ?? key;
  };

  const { colors } = useResolvedTheme(draftThemeMode);

  const themes = useMemo(
    () =>
      [
        { key: "systeme", label: t("followSystem") },
        { key: "clair", label: t("light") },
        { key: "sombre", label: t("dark") },
      ] as const,
    [t]
  );

  const langues = useMemo(
    () =>
      [
        { key: "systeme", label: t("followSystem") },
        { key: "zh", label: t("chinese") },
        { key: "en", label: t("english") },
        { key: "fr", label: t("french") },
      ] as const,
    [t]
  );

  const themeLabel =
    draftThemeMode === "systeme"
      ? t("followSystem")
      : draftThemeMode === "clair"
      ? t("light")
      : t("dark");

  const langLabel =
    draftLanguage === "systeme"
      ? t("followSystem")
      : draftLanguage === "fr"
      ? t("french")
      : draftLanguage === "en"
      ? t("english")
      : t("chinese");

  const handleSave = () => {
    setThemeMode(draftThemeMode);
    setLanguage(draftLanguage);
    setNotificationsEnabled(draftNotificationsEnabled);
    setIsDirty(false);
    Alert.alert(t("generalSave"), t("generalSaveMessage"));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>— {t("general")} —</Text>

        <View style={styles.content}>
          <View>
            <TouchableOpacity
              style={[styles.item, { backgroundColor: colors.card }]}
              onPress={() => setThemeVisible(true)}
            >
              <Text style={[styles.label, { color: colors.text }]}>{t("theme")}</Text>
              <View style={styles.right}>
                <Text style={[styles.value, { color: colors.subtext }]}>{themeLabel}</Text>
                <ChevronRight size={18} color={colors.subtext} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.item, { backgroundColor: colors.card }]}
              onPress={() => setLangVisible(true)}
            >
              <Text style={[styles.label, { color: colors.text }]}>{t("language")}</Text>
              <View style={styles.right}>
                <Text style={[styles.value, { color: colors.subtext }]}>{langLabel}</Text>
                <ChevronRight size={18} color={colors.subtext} />
              </View>
            </TouchableOpacity>

            <View style={[styles.item, { backgroundColor: colors.card }]}>
              <Text style={[styles.label, { color: colors.text }]}>{t("notifications")}</Text>
              <Switch
                value={draftNotificationsEnabled}
                onValueChange={(value) => {
                  setDraftNotificationsEnabled(value);
                  setIsDirty(true);
                }}
                trackColor={{
                  false: colors.subtext,
                  true: colors.subaccent,
                }}
                thumbColor={draftNotificationsEnabled ? colors.accent : colors.text}
                ios_backgroundColor={colors.subtext}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={handleSave}
            >
              <Text style={[styles.saveButtonText, { color: colors.text }]}>
                {t("generalSave")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={themeVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            {themes.map((item) => (
              <Pressable
                key={item.key}
                style={styles.option}
                onPress={() => {
                  setDraftThemeMode(item.key);
                  setIsDirty(true);
                  setThemeVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
                {draftThemeMode === item.key && <Check size={18} color={colors.text} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={langVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            {langues.map((item) => (
              <Pressable
                key={item.key}
                style={styles.option}
                onPress={() => {
                  setDraftLanguage(item.key);
                  setIsDirty(true);
                  setLangVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
                {draftLanguage === item.key && <Check size={18} color={colors.text} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 60,
  },
  header: {
    alignItems: "flex-start",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  item: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  value: {
    fontSize: 14,
  },
  footer: {
    paddingBottom: 20,
    alignItems: "center",
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    borderWidth: 1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 30,
  },
  modal: {
    borderRadius: 16,
    paddingVertical: 10,
  },
  option: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
  },
});
