import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search, ArchiveRestore, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import SettingsConfirmModal from "../components/SettingsConfirmModal";
import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from "../hooks/useUIScale";
import { useHaptics } from "../hooks/useHaptics";
import { chatService } from "../services/chatService";
import { useChatStore } from "../store/chatStore";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayDiffFromNow(date: Date) {
  const now = startOfDay(new Date());
  const target = startOfDay(date);
  return Math.floor((now.getTime() - target.getTime()) / 86400000);
}

function getLocale(language: string) {
  if (language.startsWith("fr")) return "fr-FR";
  if (language.startsWith("zh")) return "zh-CN";
  return "en-US";
}

function parseChatDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const normalized = value < 1e12 ? value * 1000 : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const normalized = numeric < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRowDate(value: string | number | null | undefined) {
  const date = parseChatDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t, i18n } = useI18n();
  const scaledTitleSize = useUIScale(22);
  const scaledSectionLabelSize = useUIScale(16);
  const scaledGroupLabelSize = useUIScale(15);
  const scaledInputSize = useUIScale(15);
  const scaledDateSize = useUIScale(14);
  const scaledChatTitleSize = useUIScale(16);
  const scaledButtonTextSize = useUIScale(16);
  const scaledBackButtonSize = useUIScale(40);
  const scaledBackIconSize = useUIScale(22);
  const scaledSearchIconSize = useUIScale(18);
  const scaledRowActionIconSize = useUIScale(18);
  const scaledPanelRadius = useUIScale(24);
  const scaledSearchBoxHeight = useUIScale(44);
  const scaledSearchBoxRadius = useUIScale(14);
  const scaledRowMinHeight = useUIScale(52);
  const scaledIconButtonPaddingX = useUIScale(8);
  const scaledIconButtonPaddingY = useUIScale(6);
  const scaledSecondaryButtonMinWidth = useUIScale(250);
  const { haptics } = useHaptics();

  const {
    archivedChats,
    fetchArchivedChats,
    toggleArchiveChat,
    deleteChat,
    unarchiveAllChats,
  } = useChatStore();
  
  const [search, setSearch] = useState("");
  const [confirmMode, setConfirmMode] = useState<"unarchiveAll" | "exportAll" | "deleteOne" | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatTitle, setSelectedChatTitle] = useState("");

  useEffect(() => {
    fetchArchivedChats();
  }, [fetchArchivedChats]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return archivedChats;

    return archivedChats.filter((item: any) =>
      String(item?.title || "").toLowerCase().includes(q)
    );
  }, [archivedChats, search]);

  const groupedChats = useMemo(() => {
    const locale = getLocale(i18n.language);
    const monthFormatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      ...(locale === "zh-CN" ? { year: "numeric" } : {}),
    });

    const groups: { label: string; items: any[] }[] = [];
    const map = new Map<string, any[]>();

    filteredChats.forEach((item: any) => {
      const parsed = parseChatDate(item?.updated_at);
      const valid = !!parsed;

      let label = t("archivedLast30Days");
      if (valid && parsed) {
        const diff = getDayDiffFromNow(parsed);
        if (diff === 0) {
          label = t("archivedToday");
        } else if (diff === 1) {
          label = t("archivedYesterday");
        } else if (diff <= 7) {
          label = t("archivedLast7Days");
        } else if (diff <= 30) {
          label = t("archivedLast30Days");
        } else {
          label = monthFormatter.format(parsed);
        }
      }

      if (!map.has(label)) {
        const items: any[] = [];
        map.set(label, items);
        groups.push({ label, items });
      }

      map.get(label)!.push(item);
    });

    return groups;
  }, [filteredChats, i18n.language, t]);

  const handleUnarchiveAll = async () => {
    try {
      await unarchiveAllChats();
      setConfirmMode(null);
    } catch (error) {
      console.error("Error unarchiving all chats:", error);
    }
  };

  const handleExportAll = async () => {
    try {
      const data = await chatService.exportAllArchivedChats();

      const json = JSON.stringify(data, null, 2);
      const fileUri = FileSystem.documentDirectory + "archived-chats-export.json";

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: t("exportAllArchivedChats"),
        });
      }

      setConfirmMode(null);
    } catch (error) {
      console.error("Erreur export archived chats:", error);
    }
  };

  const openDeleteConfirm = (chatId: string, chatTitle?: string | null) => {
    setSelectedChatId(chatId);
    setSelectedChatTitle(chatTitle || "Untitled chat");
    setConfirmMode("deleteOne");
  };

  const handleDeleteOne = async () => {
    if (!selectedChatId) return;

    try {
      await deleteChat(selectedChatId);
      setConfirmMode(null);
      setSelectedChatId(null);
      setSelectedChatTitle("");
    } catch (error) {
      console.error("Error deleting archived chat:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics("light");
              router.back();
            }}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: scaledBackButtonSize,
                height: scaledBackButtonSize,
                borderRadius: scaledBackButtonSize / 2,
              },
            ]}
          >
            <ChevronLeft size={scaledBackIconSize} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.text, fontSize: scaledTitleSize }]}>
          — {t("archivedChats")} —       </Text>

        <View style={[styles.panel, { backgroundColor: colors.card, borderRadius: scaledPanelRadius }]}>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.bg,
                borderColor: colors.border,
                height: scaledSearchBoxHeight,
                borderRadius: scaledSearchBoxRadius,
              },
            ]}
          >
            <Search size={scaledSearchIconSize} color={colors.subtext} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("searchChats")}
              placeholderTextColor={colors.subtext}
              style={[styles.searchInput, { color: colors.text, fontSize: scaledInputSize }]}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text, fontSize: scaledSectionLabelSize }]}>
            {t("title")}
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredChats.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.subtext, fontSize: scaledGroupLabelSize }]}>
                {t("adeNoResults")}
              </Text>
            ) : (
              groupedChats.map((group) => (
                <View key={group.label} style={styles.groupBlock}>
                  <Text style={[styles.groupLabel, { color: colors.subtext, fontSize: scaledGroupLabelSize }]}>
                    {group.label}
                  </Text>

                  {group.items.map((item: any) => (
                    <View key={item.id} style={[styles.row, { minHeight: scaledRowMinHeight }]}>
                      <View style={styles.rowLeft}>
                        <Text
                          numberOfLines={1}
                          style={[styles.chatTitle, { color: colors.text, fontSize: scaledChatTitleSize }]}
                        >
                          {item.title || "Untitled chat"}
                        </Text>
                      </View>

                      <View style={styles.rowMeta}>
                        <Text style={[styles.dateText, { color: colors.subtext, fontSize: scaledDateSize }]}>
                          {formatRowDate(item.updated_at)}
                        </Text>
                      </View>

                      <View style={styles.rowActions}>
                        <Pressable
                          style={[
                            styles.iconButton,
                            {
                              paddingHorizontal: scaledIconButtonPaddingX,
                              paddingVertical: scaledIconButtonPaddingY,
                            },
                          ]}
                          onPress={() => {
                            haptics("light");
                            toggleArchiveChat(item.id);
                          }}
                        >
                          <ArchiveRestore size={scaledRowActionIconSize} color={colors.subtext} />
                        </Pressable>

                        <Pressable
                          style={[
                            styles.iconButton,
                            {
                              paddingHorizontal: scaledIconButtonPaddingX,
                              paddingVertical: scaledIconButtonPaddingY,
                            },
                          ]}
                          onPress={() => {
                            haptics("light");
                            openDeleteConfirm(item.id, item.title);
                          }}
                        >
                          <Trash2 size={scaledRowActionIconSize} color={colors.subtext} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.secondaryActionButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  minWidth: scaledSecondaryButtonMinWidth,
                },
              ]}
              onPress={() => {
                haptics("light");
                setConfirmMode("unarchiveAll");
              }}
            >
              <Text style={[styles.secondaryActionText, { color: colors.text, fontSize: scaledButtonTextSize }]}>
                {t("unarchiveAllArchivedChats")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryActionButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  minWidth: scaledSecondaryButtonMinWidth,
                },
              ]}
              onPress={() => {
                haptics("light");
                setConfirmMode("exportAll");
              }}
            >
              <Text style={[styles.secondaryActionText, { color: colors.text, fontSize: scaledButtonTextSize }]}>
                {t("exportAllArchivedChats")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <SettingsConfirmModal
        visible={confirmMode === "unarchiveAll"}
        title={t("archivedChats")}
        message={t("confirmUnarchiveAllArchivedChats")}
        cancelText={t("cancel")}
        confirmText={t("dataControlsConfirm")}
        onCancel={() => setConfirmMode(null)}
        onConfirm={handleUnarchiveAll}
        colors={colors}
      />

      <SettingsConfirmModal
        visible={confirmMode === "exportAll"}
        title={t("archivedChats")}
        message={t("confirmExportAllArchivedChats")}
        cancelText={t("cancel")}
        confirmText={t("dataControlsConfirm")}
        onCancel={() => setConfirmMode(null)}
        onConfirm={handleExportAll}
        colors={colors}
      />

      <SettingsConfirmModal
        visible={confirmMode === "deleteOne"}
        title={t("deleteChat")}
        message={`${t("deleteChatConfirm")}\n\n${selectedChatTitle}`}
        cancelText={t("cancel")}
        confirmText={t("dataControlsConfirm")}
        onCancel={() => {
          setConfirmMode(null);
          setSelectedChatId(null);
          setSelectedChatTitle("");
        }}
        onConfirm={handleDeleteOne}
        colors={colors}
        danger
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
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
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  panel: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 20,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  closeText: {
    fontSize: 28,
    lineHeight: 28,
  },
  searchBox: {
    marginTop: 16,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  sectionLabel: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "500",
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  groupBlock: {
    marginBottom: 18,
  },
  groupLabel: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  rowMeta: {
    minWidth: 92,
    alignItems: "flex-end",
    marginRight: 8,
  },
  dateText: {
    fontSize: 14,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 4,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
  },
  footer: {
    paddingTop: 8,
    alignItems: "center",
  },
  secondaryActionButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 250,
    alignItems: "center",
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
