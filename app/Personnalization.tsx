import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Switch,
  Pressable,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useI18n } from "../i18n/useI18n";
import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";

type MemoryItem = {
  id: string;
  userName: string;
  updatedAt: string;
  detail: string;
};

type ViewMode = "list" | "edit" | "confirmClear";

function formatCurrentDateTime() {
  const d = new Date();
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractUserName(detail: string) {
  const v = detail.trim();
  if (!v) return "Utilisateur";
  return v.length <= 28 ? v : v.slice(0, 28) + "…";
}

function ManageMemoryModal({
  visible,
  onClose,
  memories,
  setMemories,
}: {
  visible: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryItem[]>>;
}) {
  const [mode, setMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailText, setDetailText] = useState("");

  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);

  const isEditing = editingId !== null;

  const resetPanels = useCallback(() => {
    setMode("list");
    setEditingId(null);
    setDetailText("");
    Keyboard.dismiss();
  }, []);

  const closeAll = useCallback(() => {
    resetPanels();
    onClose();
  }, [onClose, resetPanels]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setDetailText("");
    setMode("edit");
  }, []);

  const openEdit = useCallback((memory: MemoryItem) => {
    setEditingId(memory.id);
    setDetailText(memory.detail);
    setMode("edit");
  }, []);

  const deleteOne = useCallback(
    (id: string) => {
      setMemories((prev) => prev.filter((memory) => memory.id !== id));
    },
    [setMemories]
  );

  const askClearAll = useCallback(() => {
    setMode("confirmClear");
  }, []);

  const clearAll = useCallback(() => {
    setMemories([]);
    resetPanels();
  }, [resetPanels, setMemories]);

  const upsertMemory = useCallback(() => {
    const trimmedValue = detailText.trim();
    if (!trimmedValue) return;

    const payload = {
      userName: extractUserName(trimmedValue),
      detail: trimmedValue,
      updatedAt: formatCurrentDateTime(),
    };

    setMemories((prev) => {
      if (editingId) {
        return prev.map((memory) =>
          memory.id === editingId ? { ...memory, ...payload } : memory
        );
      }

      return [...prev, { id: Date.now().toString(), ...payload }];
    });

    resetPanels();
  }, [detailText, editingId, resetPanels, setMemories]);

  const footer = useMemo(
    () => (
      <View style={styles.footerRow}>
        <Pressable
          style={[
            styles.secondaryActionButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={openAdd}
        >
          <Text style={[styles.secondaryActionText, { color: colors.text }]}>
            {t("persoAddMemory")}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.dangerActionButton, { backgroundColor: colors.card }]}
          onPress={askClearAll}
        >
          <Text style={styles.dangerActionText}>{t("persoClearMemory")}</Text>
        </Pressable>
      </View>
    ),
    [askClearAll, colors, openAdd, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: MemoryItem }) => (
      <View style={[styles.memoryRow, { borderColor: colors.border }]}>
        <Text style={[styles.nameColumn, { color: colors.text }]} numberOfLines={2}>
          {item.userName}
        </Text>

        <View style={styles.rightZone}>
          <Text style={[styles.dateColumn, { color: colors.text }]} numberOfLines={1}>
            {item.updatedAt}
          </Text>

          <Pressable onPress={() => openEdit(item)} style={styles.iconButton} hitSlop={8}>
            <Pencil size={18} color={colors.text} />
          </Pressable>

          <Pressable onPress={() => deleteOne(item.id)} style={styles.iconButton} hitSlop={8}>
            <Trash2 size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>
    ),
    [colors, deleteOne, openEdit]
  );

  const showOverlay = mode !== "list";

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAll}>
      <View style={styles.bottomOverlay}>
        <KeyboardAvoidingView
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("persoMemoryTitle")}
            </Text>
            <Pressable onPress={closeAll} hitSlop={10}>
              <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.columnHeaderRow}>
            <Text style={[styles.columnHeaderText, { color: colors.text }]}>
              {t("persoUsernameColumn")}
            </Text>
            <Text style={[styles.columnHeaderDate, { color: colors.text }]}>
              {t("persoUpdatedColumn")}
            </Text>
          </View>

          <FlatList
            data={memories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              memories.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                {t("persoEmptyState")}
              </Text>
            }
            ListFooterComponent={footer}
            keyboardShouldPersistTaps="handled"
          />

          {showOverlay && (
            <Pressable style={styles.overlayMask} onPress={Keyboard.dismiss}>
              <View />
            </Pressable>
          )}

          {mode === "edit" && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.overlayCenterContainer}
            >
              <View
                style={[
                  styles.overlayCardCenter,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.overlayHeaderRow}>
                  <Pressable onPress={resetPanels} hitSlop={10}>
                    <Text style={[styles.overlayLink, { color: colors.text }]}>
                      {t("cancel")}
                    </Text>
                  </Pressable>

                  <Pressable onPress={Keyboard.dismiss} hitSlop={10}>
                    <View />
                  </Pressable>

                  <Pressable onPress={upsertMemory} hitSlop={10}>
                    <Text style={[styles.overlayPrimary, { color: colors.text }]}>
                      {isEditing ? t("persoSave") : t("persoAdd")}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[styles.overlayTitle, { color: colors.text }]}>
                  {isEditing ? t("persoEditMemory") : t("persoAddMemory")}
                </Text>

                <View style={[styles.inputZone, { borderColor: colors.border }]}>
                  <TextInput
                    value={detailText}
                    onChangeText={setDetailText}
                    placeholder={t("persoInputPlaceholder")}
                    placeholderTextColor={colors.subtext}
                    style={[styles.input, { color: colors.text }]}
                    multiline
                    autoFocus
                  />
                </View>

                <View style={styles.hintRow}>
                  <Text style={[styles.hintIcon, { color: colors.subtext }]}>ⓘ</Text>
                  <Text style={[styles.hintText, { color: colors.subtext }]}>
                    {t("persoInputHint")}
                  </Text>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}

          {mode === "confirmClear" && (
            <View
              style={[
                styles.overlayCardBottom,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.overlayTitle, { color: colors.text }]}>
                {t("persoClearMemory")}
              </Text>

              <Text style={[styles.clearDescription, { color: colors.subtext }]}>
                {t("persoClearConfirmText")}
              </Text>

              <View style={styles.clearButtonsRow}>
                <Pressable
                  style={[styles.cancelClearButton, { backgroundColor: colors.border }]}
                  onPress={resetPanels}
                >
                  <Text style={[styles.cancelClearText, { color: colors.text }]}>
                    {t("cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.confirmClearButton, { backgroundColor: colors.text }]}
                  onPress={clearAll}
                >
                  <Text style={[styles.confirmClearText, { color: colors.bg }]}>
                    {t("persoConfirm")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function PersonnalizationScreen() {
  const router = useRouter();
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(true);
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);

  const isManageDisabled = !isMemoryEnabled;

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

        <Text style={[styles.pageTitle, { color: colors.text }]}>
          — {t("personalization")} —
        </Text>

        <View style={styles.content}>
          <View
            style={[
              styles.memoryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t("persoMemoryTitle")}{" "}
                  <Text style={[styles.experimental, { color: colors.subtext }]}>
                    ({t("persoExperimental")})
                  </Text>
                </Text>

                <Text style={[styles.description, { color: colors.subtext }]}>
                  {t("persoDescription")}
                </Text>
              </View>

              <Switch
                value={isMemoryEnabled}
                onValueChange={setIsMemoryEnabled}
                trackColor={{
                  false: colors.subtext,
                  true: colors.subaccent,
                }}
                thumbColor={isMemoryEnabled ? colors.accent : colors.text}
                ios_backgroundColor={colors.subtext}
              />
            </View>

            <Pressable
              style={[
                styles.manageButton,
                isManageDisabled && styles.disabledButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              disabled={isManageDisabled}
              onPress={() => setIsManageModalVisible(true)}
            >
              <Text style={[styles.manageButtonText, { color: colors.text }]}>
                {t("persoManage")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => Alert.alert(t("persoSave"), t("persoSaveMessage"))}
            >
              <Text style={[styles.saveButtonText, { color: colors.text }]}>
                {t("persoSave")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ManageMemoryModal
        visible={isManageModalVisible}
        onClose={() => setIsManageModalVisible(false)}
        memories={memories}
        setMemories={setMemories}
      />
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
    textAlign: "center",
  },
  memoryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  experimental: {
    fontWeight: "600",
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  manageButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.4,
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
  bottomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "90%",
    paddingTop: 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  closeText: {
    fontSize: 22,
  },
  columnHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  columnHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.7,
  },
  columnHeaderDate: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.7,
    textAlign: "right",
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyText: {
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  memoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  nameColumn: {
    flex: 1,
    fontSize: 16,
    paddingRight: 12,
  },
  rightZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  dateColumn: {
    maxWidth: 200,
    marginRight: 14,
    fontSize: 16,
    opacity: 0.75,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 26,
    paddingHorizontal: 24,
  },
  secondaryActionButton: {
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontWeight: "800",
  },
  dangerActionButton: {
    marginLeft: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  dangerActionText: {
    fontWeight: "800",
    color: "#DC2626",
  },
  overlayMask: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  overlayCenterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayCardCenter: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  overlayCardBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  overlayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  overlayTitle: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "800",
  },
  overlayLink: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.75,
  },
  overlayPrimary: {
    fontSize: 14,
    fontWeight: "900",
  },
  inputZone: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  input: {
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: "top",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
  },
  hintIcon: {
    marginTop: 2,
    marginRight: 8,
    fontSize: 14,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  clearDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  clearButtonsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelClearButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelClearText: {
    fontSize: 16,
    fontWeight: "800",
  },
  confirmClearButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmClearText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
