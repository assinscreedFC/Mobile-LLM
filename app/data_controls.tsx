import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  Feather,
  Fontisto
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import SettingsConfirmModal from "../components/SettingsConfirmModal";
import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from "../hooks/useUIScale";
import { useHaptics } from "../hooks/useHaptics";
import { chatService } from "../services/chatService";
import { useChatStore } from "../store/chatStore";

export default function DataControlsScreen() {
  const router = useRouter();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { archiveAllChats, deleteAllChats, fetchHistory, fetchArchivedChats } = useChatStore();
  const { t } = useI18n();
  const scaledTitleSize = useUIScale(22);
  const scaledLabelSize = useUIScale(16);
  const scaledBackButtonSize = useUIScale(40);
  const scaledBackIconSize = useUIScale(22);
  const scaledRowIconSize = useUIScale(22);
  const scaledFontistoIconSize = useUIScale(20);
  const scaledChevronSize = useUIScale(18);
  const { haptics } = useHaptics();
  const [confirmMode, setConfirmMode] = useState<"archiveAll" | "deleteAll" | null>(null);

  const dataControlOptions = [
      {
        id: "0",
        text: t("importChats"),
        icon: "import",
        lib: "Fontisto",
        route: null,
        danger: false,
      },
      {
        id: "1",
        text: t("exportChats"),
        icon: "export",
        lib: "Fontisto",
        route: null,
        danger: false,
      },
      {
        id: "2",
        text: t("archivedChats"),
        icon: "archive",
        lib: "Feather",
        route: "/archivedChats",
        danger: false,
      },
      {
        id: "3",
        text: t("archiveAllChats"),
        icon: "archive-outline",
        lib: "Ionicons",
        route: null,
        danger: false,
      },
      {
        id: "4",
        text: t("deleteAllChats"),
        icon: "trash-outline",
        lib: "Ionicons",
        route: null,
        danger: true,
      },
    ] as const;

  const renderIcon = (item: typeof dataControlOptions[number]) => {
    const iconColor = item.danger ? "#DC2626" : colors.text;

    switch (item.lib) {
      case "Feather":
        return <Feather name={item.icon} size={scaledRowIconSize} color={iconColor} />;
      case "Ionicons":
        return <Ionicons name={item.icon} size={scaledRowIconSize} color={iconColor} />;
      case "Fontisto":
        return <Fontisto name={item.icon} size={scaledFontistoIconSize} color={iconColor} />;
      default:
        return null;
    }
  };
  const handleArchiveAll = async () => {
    try {
      await archiveAllChats();
      setConfirmMode(null);  
    } catch (error) {
      console.error("Error archiving all chats:", error);
    }
  };

  const handleImportChats = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file?.uri) return;

      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = JSON.parse(content);

      const chats = Array.isArray(parsed) ? parsed : parsed?.chats;

      if (!Array.isArray(chats)) {
        Alert.alert(t("importChats"), t("invalidImportFile"));
        return;
      }

      await chatService.importChats(chats);
      await fetchHistory();
      await fetchArchivedChats();

      Alert.alert(t("importChats"), t("importChatsSuccess"));
    } catch (error) {
      console.error("Error importing chats:", error);
      Alert.alert(t("importChats"), t("importChatsError"));
    }
  };
  const handleExportAll = async () => {
    try {
      const data = await chatService.exportAllChats();

      const json = JSON.stringify(data, null, 2);
      const fileUri = FileSystem.documentDirectory + "all-chats-export.json";

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: t("exportChats"),
        });
      }
    } catch (error) {
      console.error("Error exporting all chats:", error);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllChats();
      setConfirmMode(null);
    } catch (error) {
      console.error("Error deleting all chats:", error);
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
          — {t("dataControls")} —
        </Text>

        <View style={styles.content}>
          {dataControlOptions.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.item, { backgroundColor: colors.card }]}
              onPress={() => {
                haptics("light");

                if (item.id === "0") {
                  handleImportChats();
                  return;
                }

                if (item.id === "1") {
                  handleExportAll();
                  return;
                }

                if (item.id === "3") {
                  setConfirmMode("archiveAll");
                  return;
                }

                if (item.id === "4") {
                  setConfirmMode("deleteAll");
                  return;
                }

                if (item.route) {
                  router.push(item.route);
                }
              }}
            >
              <View style={styles.left}>
                <View style={styles.iconWrapper}>{renderIcon(item)}</View>
                <Text
                  minimumFontScale={0.8}
                  ellipsizeMode="tail"
                  style={[
                    styles.label,
                    {
                      color: item.danger ? "#DC2626" : colors.text,
                      fontSize: scaledLabelSize,
                    },
                  ]}
                >
                  {item.text}
                </Text>
              </View>

              {item.route ? (
                <ChevronRight size={scaledChevronSize} color={colors.subtext} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
      <SettingsConfirmModal
        visible={confirmMode === "archiveAll"}
        title={t("dataControls")}
        message={t("confirmArchiveAllChats")}
        cancelText={t("cancel")}
        confirmText={t("archiveAllChats")}
        onCancel={() => setConfirmMode(null)}
        onConfirm={handleArchiveAll}
        colors={colors}
      />

      <SettingsConfirmModal
        visible={confirmMode === "deleteAll"}
        title={t("dataControls")}
        message={t("confirmDeleteAllChats")}
        cancelText={t("cancel")}
        confirmText={t("deleteAllChats")}
        onCancel={() => setConfirmMode(null)}
        onConfirm={handleDeleteAll}
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
  content: {
    flex: 1,
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
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  iconWrapper: {
    width: 28,
    marginRight: 14,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
});
