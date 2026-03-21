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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { login } from "../services/authService";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

type Props = {
  goSignUp: () => void;
};

export default function SignIn({ goSignUp }: Props) {
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailValue || !passwordValue) {
      Alert.alert(t("error"), t("fillAllFields"));
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(emailValue, passwordValue);
      if (success) router.push("/chat");
    } catch {
      Alert.alert(t("loginFailed"), t("loginFailedDesc"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {t("signInTo")} <Text style={styles.brand}>PLEIADE</Text>
          </Text>

          <Text style={styles.label}>{t("email")}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="prenom.nom@etu.u-paris.fr"
              placeholderTextColor={colors.subtext}
              value={emailValue}
              onChangeText={setEmailValue}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={[styles.label, styles.space]}>{t("password")}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={[styles.input, { paddingRight: 44 }]}
              placeholder={t("enterPassword")}
              placeholderTextColor={colors.subtext}
              secureTextEntry={!show}
              value={passwordValue}
              onChangeText={setPasswordValue}
            />
            <Pressable style={styles.eye} onPress={() => setShow(!show)}>
              <Ionicons
                name={show ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={colors.text}
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.primaryText}>
              {isLoading ? t("connecting") : t("signIn")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.bottomText}>{t("noAccount")}</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/sign-up")}
          >
            <Text style={styles.secondaryText}>{t("signUp")}</Text>
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

    inputBox: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    input: {
      height: 52,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.text,
    },

    eye: {
      position: "absolute",
      right: 14,
      height: 52,
      justifyContent: "center",
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

    bottom: { marginTop: "auto", padding: 28 },
    bottomText: { marginBottom: 12, color: colors.text },
    secondaryBtn: {
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.card,
    },
    secondaryText: { fontSize: 17, fontWeight: "700", color: colors.text },
  });
}
