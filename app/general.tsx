import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { ChevronLeft, ChevronRight, Check } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

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

  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const [themeVisible, setThemeVisible] = useState(false);
  const [langVisible, setLangVisible] = useState(false);

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
        { key: "zh", label: t("chinese") },
        { key: "en", label: t("english") },
        { key: "fr", label: t("french") },
      ] as const,
    [t]
  );

  const themeLabel =
    themeMode === "systeme"
      ? t("followSystem")
      : themeMode === "clair"
      ? t("light")
      : t("dark");

  const langLabel =
    language === "fr" ? t("french") : language === "en" ? t("english") : t("chinese");

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace("/accountScreen")}
          style={[
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{t("general")}</Text>

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
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </View>

      <Modal visible={themeVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            {themes.map((item) => (
              <Pressable
                key={item.key}
                style={styles.option}
                onPress={() => {
                  setThemeMode(item.key);
                  setThemeVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
                {themeMode === item.key && <Check size={18} color={colors.text} />}
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
                  setLanguage(item.key);
                  setLangVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{item.label}</Text>
                {language === item.key && <Check size={18} color={colors.text} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 60,
  },
  header: {
    alignItems: "flex-start",
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
