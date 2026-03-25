import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

const APP_VERSION = "v0.7.2";
const OLLAMA_VERSION = "0.14.3";
const GITHUB_STARS = "128k";

const LINKS = {
  releaseNotes: "https://github.com/open-webui/open-webui/releases",
  github: "https://github.com/open-webui/open-webui",
  creator: "https://github.com/tjbck",
};

function SectionCard({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: { card: string; border: string };
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

function AboutChip({
  label,
  colors,
  compact = false,
  onPress,
}: {
  label: string;
  colors: { card: string; border: string; text: string };
  compact?: boolean;
  onPress?: () => void;
}) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={[
        styles.chip,
        compact ? styles.chipCompact : styles.chipPrimary,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      {...(onPress ? { onPress } : {})}
    >
      <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
    </Container>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);

  const handleCheckUpdates = () => {
    Alert.alert(
      t("aboutCheckUpdates"),
      t("aboutNoUpdatesMessage", { version: APP_VERSION })
    );
  };

  const handleOpenReleaseNotes = async () => {
    await Linking.openURL(LINKS.releaseNotes);
  };

  const handleOpenGithub = async () => {
    await Linking.openURL(LINKS.github);
  };

  const handleOpenCreator = async () => {
    await Linking.openURL(LINKS.creator);
  };

  const chips = [
    { key: "discord", label: t("aboutDiscord") },
    { key: "open-webui", label: t("aboutOpenWebUI") },
    { key: "follow", label: t("aboutFollowOpenWebUI") },
    { key: "github", label: t("aboutStarGithub"), onPress: handleOpenGithub },
    { key: "stars", label: GITHUB_STARS, compact: true },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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

        <Text style={[styles.pageTitle, { color: colors.text }]}>{t("about")}</Text>

        <SectionCard colors={colors}>
          <View style={styles.versionRow}>
            <View style={styles.versionContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("aboutProductVersionLabel")}
              </Text>

              <Text style={[styles.versionValue, { color: colors.text }]}>
                {t("aboutVersionStatus", { version: APP_VERSION })}
              </Text>

              <Pressable onPress={handleOpenReleaseNotes} hitSlop={6}>
                <Text style={[styles.inlineLink, { color: colors.subtext }]}>
                  {t("aboutReleaseNotes")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.updateButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={handleCheckUpdates}
            >
              <Text style={[styles.updateButtonText, { color: colors.text }]}>
                {t("aboutCheckUpdates")}
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard colors={colors}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("aboutOllamaVersion")}
          </Text>
          <Text style={[styles.versionValue, { color: colors.text }]}>{OLLAMA_VERSION}</Text>
        </SectionCard>

        <SectionCard colors={colors}>
          <View style={styles.chipsRow}>
            {chips.map((chip) => (
              <AboutChip
                key={chip.key}
                label={chip.label}
                colors={colors}
                compact={chip.compact}
                onPress={chip.onPress}
              />
            ))}
          </View>

          <Text style={[styles.metaText, { color: colors.subtext }]}>
            {t("aboutEmojiCredit")}
          </Text>
          <Text style={[styles.metaText, { color: colors.subtext }]}>
            {t("aboutCopyright")}
          </Text>
          <Text style={[styles.metaText, { color: colors.subtext }]}>
            {t("aboutCreatedByPrefix")}
            <Text
              style={[styles.metaLink, { color: colors.subtext }]}
              onPress={handleOpenCreator}
            >
              {t("aboutCreatedByName")}
            </Text>
            {t("aboutCreatedBySuffix")}
          </Text>
        </SectionCard>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    alignItems: "flex-start",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 24,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  versionContent: {
    flex: 1,
    minWidth: 220,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 18,
  },
  inlineLink: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textDecorationLine: "underline",
  },
  updateButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
  },
  chipPrimary: {
    minHeight: 42,
    justifyContent: "center",
  },
  chipCompact: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 16,
    fontWeight: "600",
  },
  metaText: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  metaLink: {
    textDecorationLine: "underline",
  },
});
