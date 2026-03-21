import { useMemo } from "react";
import { SafeAreaView, View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

export default function Pending() {
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);
  const { t } = useI18n();

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>
          {t("pleaseWait")}
          {"\n"}
          {t("forConfirmation")}
        </Text>

        <Text style={styles.desc}>
          {t("thankYou")}
          {"\n"}
          {t("registrationSoon")}
        </Text>

        <Pressable
          style={styles.btn}
          onPress={() => router.replace("/sign-in")}
        >
          <Text style={styles.btnText}>{t("backToSignIn")}</Text>
        </Pressable>
      </View>
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

    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
    },

    title: {
      fontSize: 30,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 14,
      color: colors.text,
    },

    desc: {
      fontSize: 15,
      textAlign: "center",
      color: colors.subtext,
    },

    btn: {
      marginTop: 26,
      height: 46,
      paddingHorizontal: 20,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: "center",
    },

    btnText: {
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
  });
}
