import { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

export default function SignUp() {
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {t("signUpFor")} <Text style={styles.brand}>PLEIADE</Text>
          </Text>

          <Text style={styles.label}>{t("name")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("enterFullName")}
            placeholderTextColor={colors.subtext}
            value={nameValue}
            onChangeText={setNameValue}
          />

          <Text style={[styles.label, styles.space]}>{t("email")}</Text>
          <TextInput
            style={styles.input}
            placeholder="prenom.nom@etu.u-paris.fr"
            placeholderTextColor={colors.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
            value={emailValue}
            onChangeText={setEmailValue}
          />

          <Text style={[styles.label, styles.space]}>{t("password")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("enterPassword")}
            placeholderTextColor={colors.subtext}
            value={passwordValue}
            onChangeText={setPasswordValue}
            secureTextEntry
          />

          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace("/pending")}
          >
            <Text style={styles.primaryText}>{t("signUp")}</Text>
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>{t("back")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
}) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 150 },

    title: {
      fontSize: 34,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: 40,
      color: colors.text,
    },
    brand: {
      color: colors.text,
      fontWeight: "700",
    },

    label: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 8,
      color: colors.text,
    },
    space: { marginTop: 20 },

    input: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },

    primaryBtn: {
      marginTop: 26,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryText: { fontSize: 17, fontWeight: "700", color: colors.text },

    back: { marginTop: 20, textAlign: "center", color: colors.text },
  });
}
