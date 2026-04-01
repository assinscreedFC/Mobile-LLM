import React from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";

type SettingsConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
  colors: {
    bg: string;
    card: string;
    border: string;
    text: string;
    subtext: string;
  };
  danger?: boolean;
};

export default function SettingsConfirmModal({
  visible,
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  colors,
  danger = false,
}: SettingsConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlayMask}>
        <View
          style={[
            styles.overlayCardBottom,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.overlayTitle, { color: colors.text }]}>{title}</Text>

          <Text style={[styles.clearDescription, { color: colors.subtext }]}>
            {message}
          </Text>

          <View style={styles.clearButtonsRow}>
            <Pressable
              style={[styles.cancelClearButton, { backgroundColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelClearText, { color: colors.text }]}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.confirmClearButton,
                { backgroundColor: danger ? "#DC2626" : colors.text },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmClearText, { color: colors.bg }]}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayMask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayCardBottom: {
    width: "88%",
    maxWidth: 420,
    margin: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  overlayTitle: {
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "800",
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
