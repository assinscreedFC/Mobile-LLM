import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import {
  ChevronLeft,
  ChevronDown,
  Check,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { compteService, type CompteGenderKey, type CompteProfile } from "../services/compteService";
import { useSettingsStore } from "../store/useSettingsStore";
import { useResolvedTheme } from "../utils/theme";
import { useI18n } from "../i18n/useI18n";

export default function CompteScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore();
  const { colors } = useResolvedTheme(themeMode);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<CompteGenderKey>("noAnswer");
  const [birthDate, setBirthDate] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isGenderVisible, setIsGenderVisible] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const genderOptions = useMemo(
    () =>
      [
        { key: "noAnswer", label: t("accountGenderNoAnswer") },
        { key: "female", label: t("accountGenderFemale") },
        { key: "male", label: t("accountGenderMale") },
        { key: "other", label: t("accountGenderOther") },
      ] as const,
    [t]
  );

  const initials = useMemo(() => {
    const parts = username
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "ZY";
  }, [username]);

  const selectedGenderLabel =
    genderOptions.find((option) => option.key === gender)?.label ?? t("accountGenderNoAnswer");

  const applyProfile = (profile: CompteProfile) => {
    setProfileId(profile.id);
    setEmail(profile.email);
    setRole(profile.role || "user");
    setAvatarUrl(profile.avatarUrl);
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setGender(profile.gender || "noAnswer");
    setBirthDate(profile.birthDate || "");
    setWebhookUrl(profile.webhookUrl || "");
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const profile = await compteService.getProfile();

        if (!isMounted) {
          return;
        }

        applyProfile(profile);
      } catch (error: any) {
        if (!isMounted) {
          return;
        }

        const messageKey = error?.message || "accountLoadError";
        Alert.alert(t("errorTitle"), t(messageKey));
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      setIsSavingProfile(true);

      const profile = await compteService.updateProfile({
        id: profileId ?? undefined,
        username,
        email: email || undefined,
        role: role || undefined,
        bio,
        gender,
        birthDate,
        webhookUrl,
        avatarUrl,
      });

      applyProfile(profile);
      Alert.alert(t("accountSave"), t("accountSaveMessage"));
    } catch (error: any) {
      const messageKey = error?.message || "accountSaveError";
      Alert.alert(t("errorTitle"), t(messageKey));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(t("permissionRequired"), t("galleryPermission"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert(t("errorTitle"), t("accountSaveError"));
        return;
      }

      const mimeType = asset.mimeType || "image/jpeg";
      setAvatarUrl(`data:${mimeType};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert(t("errorTitle"), t("accountSaveError"));
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("errorTitle"), t("accountPasswordFillAll"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("errorTitle"), t("accountPasswordMismatch"));
      return;
    }

    try {
      setIsUpdatingPassword(true);

      await compteService.updatePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordField(false);
      setIsCurrentPasswordVisible(false);
      setIsNewPasswordVisible(false);
      setIsConfirmPasswordVisible(false);

      Alert.alert(t("accountUpdatePassword"), t("accountPasswordUpdated"));
    } catch (error: any) {
      const messageKey = error?.message || "accountPasswordUpdateError";
      Alert.alert(t("errorTitle"), t(messageKey));
    } finally {
      setIsUpdatingPassword(false);
    }
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

        <Text style={[styles.pageTitle, { color: colors.text }]}>— {t("account")} —</Text>

        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View
              style={[
                styles.accountCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("accountPageTitle")}
              </Text>
              <Text style={[styles.sectionDescription, { color: colors.subtext }]}>
                {t("accountPageDescription")}
              </Text>

              <View style={styles.profileRow}>
                <Pressable
                  onPress={handlePickAvatar}
                  disabled={isSavingProfile}
                  style={styles.avatar}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                  <View
                    style={[
                      styles.avatarBadge,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Pencil size={14} color={colors.text} />
                  </View>
                </Pressable>

                <View style={styles.profileFields}>
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>
                      {t("accountUsername")}
                    </Text>
                    <View
                      style={[
                        styles.inputZone,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        value={username}
                        onChangeText={setUsername}
                        style={[styles.input, { color: colors.text }]}
                        placeholder={t("accountUsername")}
                        placeholderTextColor={colors.subtext}
                        editable={!isSavingProfile}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>{t("accountBio")}</Text>
                    <View
                      style={[
                        styles.inputZone,
                        styles.bioZone,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        placeholder={t("accountBioPlaceholder")}
                        placeholderTextColor={colors.subtext}
                        style={[styles.input, styles.bioInput, { color: colors.text }]}
                        editable={!isSavingProfile}
                      />
                      <Pencil size={16} color={colors.subtext} />
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {t("accountGender")}
                </Text>
                <Pressable
                  onPress={() => {
                    if (!isSavingProfile) {
                      setIsGenderVisible(true);
                    }
                  }}
                  style={[
                    styles.selectZone,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.selectValue, { color: colors.text }]}>
                    {selectedGenderLabel}
                  </Text>
                  <ChevronDown size={18} color={colors.subtext} />
                </Pressable>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {t("accountBirthDate")}
                </Text>
                <View
                  style={[
                    styles.inputZone,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    value={birthDate}
                    onChangeText={setBirthDate}
                    style={[styles.input, { color: colors.text }]}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.subtext}
                    editable={!isSavingProfile}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {t("accountWebhook")}
                </Text>
                <View
                  style={[
                    styles.inputZone,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    value={webhookUrl}
                    onChangeText={setWebhookUrl}
                    style={[styles.input, { color: colors.text }]}
                    placeholder={t("accountWebhookPlaceholder")}
                    placeholderTextColor={colors.subtext}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSavingProfile}
                  />
                </View>
              </View>

              <View style={[styles.passwordRow, { borderColor: colors.border }]}>
                <Text style={[styles.passwordLabel, { color: colors.text }]}>
                  {t("accountChangePassword")}
                </Text>
                <Pressable onPress={() => setShowPasswordField((prev) => !prev)}>
                  <Text style={[styles.passwordAction, { color: colors.subtext }]}>
                    {showPasswordField ? t("accountHide") : t("accountShow")}
                  </Text>
                </Pressable>
              </View>

              {showPasswordField && (
                <View style={styles.passwordFields}>
                  <View style={styles.passwordFieldBlock}>
                    <Text style={[styles.passwordFieldLabel, { color: colors.text }]}>
                      {t("accountCurrentPassword")}
                    </Text>
                    <View
                      style={[
                        styles.passwordInputRow,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!isCurrentPasswordVisible}
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder={t("accountCurrentPasswordPlaceholder")}
                        placeholderTextColor={colors.subtext}
                        editable={!isUpdatingPassword}
                      />
                      <Pressable onPress={() => setIsCurrentPasswordVisible((prev) => !prev)}>
                        {isCurrentPasswordVisible ? (
                          <EyeOff size={20} color={colors.subtext} />
                        ) : (
                          <Eye size={20} color={colors.subtext} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.passwordFieldBlock}>
                    <Text style={[styles.passwordFieldLabel, { color: colors.text }]}>
                      {t("accountNewPassword")}
                    </Text>
                    <View
                      style={[
                        styles.passwordInputRow,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!isNewPasswordVisible}
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder={t("accountNewPasswordPlaceholder")}
                        placeholderTextColor={colors.subtext}
                        editable={!isUpdatingPassword}
                      />
                      <Pressable onPress={() => setIsNewPasswordVisible((prev) => !prev)}>
                        {isNewPasswordVisible ? (
                          <EyeOff size={20} color={colors.subtext} />
                        ) : (
                          <Eye size={20} color={colors.subtext} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.passwordFieldBlock}>
                    <Text style={[styles.passwordFieldLabel, { color: colors.text }]}>
                      {t("accountConfirmPassword")}
                    </Text>
                    <View
                      style={[
                        styles.passwordInputRow,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!isConfirmPasswordVisible}
                        style={[styles.passwordInput, { color: colors.text }]}
                        placeholder={t("accountConfirmPasswordPlaceholder")}
                        placeholderTextColor={colors.subtext}
                        editable={!isUpdatingPassword}
                      />
                      <Pressable onPress={() => setIsConfirmPasswordVisible((prev) => !prev)}>
                        {isConfirmPasswordVisible ? (
                          <EyeOff size={20} color={colors.subtext} />
                        ) : (
                          <Eye size={20} color={colors.subtext} />
                        )}
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.passwordButtonRow}>
                    <Pressable
                      style={[
                        styles.passwordUpdateButton,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isUpdatingPassword && styles.disabledButton,
                      ]}
                      onPress={handleUpdatePassword}
                      disabled={isUpdatingPassword}
                    >
                      {isUpdatingPassword ? (
                        <ActivityIndicator color={colors.text} />
                      ) : (
                        <Text
                          style={[styles.passwordUpdateButtonText, { color: colors.text }]}
                        >
                          {t("accountUpdatePassword")}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                (isLoadingProfile || isSavingProfile) && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={isLoadingProfile || isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.text }]}>
                  {t("accountSave")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={isGenderVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            {genderOptions.map((option) => (
              <Pressable
                key={option.key}
                style={styles.option}
                onPress={() => {
                  setGender(option.key);
                  setIsGenderVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{option.label}</Text>
                {gender === option.key && <Check size={18} color={colors.text} />}
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
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  accountCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 22,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    marginRight: 18,
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileFields: {
    flex: 1,
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  inputZone: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
  },
  bioZone: {
    minHeight: 120,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bioInput: {
    flex: 1,
    minHeight: 90,
    textAlignVertical: "top",
    marginRight: 12,
  },
  selectZone: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    fontSize: 16,
  },
  passwordRow: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  passwordAction: {
    fontSize: 16,
    fontWeight: "700",
  },
  passwordFields: {
    marginTop: 18,
  },
  passwordFieldBlock: {
    marginBottom: 18,
  },
  passwordFieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  passwordInputRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    marginRight: 12,
  },
  passwordButtonRow: {
    alignItems: "center",
    marginTop: 6,
  },
  passwordUpdateButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    borderWidth: 1,
  },
  passwordUpdateButtonText: {
    fontSize: 16,
    fontWeight: "700",
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
  disabledButton: {
    opacity: 0.5,
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
