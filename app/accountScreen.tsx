/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, FlatList, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useI18n } from "../i18n/useI18n";
import { useUIScale } from '../utils/useUIScale'
import { useHaptics } from '../utils/useHaptics'
import { logout } from '../services/authService';
import { adeService } from '../services/adeService';
import { useBiometric } from '../hooks/useBiometric';


const optionsList = [
  { id: '0', textKey: 'general', icon: 'settings-outline', color: '#000', route: '/general', action: null },
  { id: '1', textKey: 'interface', icon: 'apps-outline', color: '#000', route: '/interfaceScreen', action: null },
  { id: '2', textKey: 'personalization', icon: 'person-circle-outline', color: '#000', route: '/personnalization', action: null },
  { id: '3', textKey: 'dataControls', icon: 'database-cog-outline', lib: 'MaterialCommunityIcons', color: '#000', route: '/data_controls', action: null },
  { id: '4', textKey: 'about', icon: 'information-circle-outline', color: '#000', route: '/about', action: null },
  { id: '5', textKey: 'logOut', icon: 'log-out-outline', color: '#FF0000', route: '/sign-in', action: 'logout' },
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { themeMode } = useSettingsStore()
  const { colors } = useResolvedTheme(themeMode);
  const scaledFontSize = useUIScale(24);
  const scaled48 = useUIScale(48);
  const scaleFactor = useUIScale(1);
  const { haptics } = useHaptics();
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, toggle: toggleBiometric } = useBiometric();

  // ADE state
  const [adeUser, setAdeUser] = useState('');
  const [adePass, setAdePass] = useState('');
  const [adeLoading, setAdeLoading] = useState(false);
  const [adeConnected, setAdeConnected] = useState(false);

  const handleAdeLogin = async () => {
    const user = adeUser.trim();
    const pass = adePass.trim();
    if (!user || !pass) {
      Alert.alert(t('error'), t('adeFillCredentials'));
      return;
    }
    setAdeLoading(true);
    try {
      await adeService.login(user, pass);
      setAdeConnected(true);
      Alert.alert(t('adeConsult'), t('adeConnected'));
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Erreur inconnue';
      Alert.alert(t('adeError'), msg);
    } finally {
      setAdeLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.bg }}>
      <View className="flex-1" style={{backgroundColor: colors.bg}}>
        {/* Back button */}
        <View className="flex-row items-center px-2.5">
          <Pressable onPress={() => {haptics('light'); router.back()}}>
            <Ionicons name="chevron-back" size={scaled48} color={colors.text} />
          </Pressable>
        </View>

        {/* List of options */}
        <View className="flex-row">
          <FlatList
            className="px-5 pt-5"
            data={optionsList}
            keyExtractor={item => item.id}
            /* Archived Chats and visual separator */
            ListHeaderComponent={
              <View>
                <Pressable
                  className="flex-row items-center py-5 mb-1"
                  onPress={() => {haptics('light'); router.push({ pathname: '/archivedChats' })}}
                >
                  <Ionicons name="archive-outline" size={scaled48} color={colors.text} className="mr-5 text-center" style={{width: scaled48, height: scaled48}}/>
                  <Text minimumFontScale={0.8} ellipsizeMode="tail" className="font-bold text-center" style={{color: colors.text, fontSize: scaledFontSize, marginRight:10}}>{t("archivedChats")}</Text>
                </Pressable>

                <View className="items-center mt-2.5 mb-2.5">
                  <Text minimumFontScale={0.8} ellipsizeMode="tail" className="font-bold text-center" style={{color: colors.text, fontSize: scaledFontSize, marginRight:10}}>— {t("settings")} —</Text>
                </View>
              </View>
            }
            /* One of the icons is from a different library, doing the declaration this way ensures they are rendered the same way. */
            renderItem={({ item }) => {
              const IconComponent = item.lib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;

              const handlePress = async () => {
                haptics('light');
                if (item.action === 'logout') {
                  try { await logout(); } catch (e) { console.warn('[AccountScreen] Logout error:', e); }
                  router.replace('/sign-in');
                } else {
                  router.push({ pathname: item.route });
                }
              };

              return (
                <Pressable
                  className="flex-row items-center py-5 mb-1"
                  onPress={handlePress}
                >
                  <IconComponent
                    name={item.icon as any}
                    size={scaled48}
                    color={item.color == '#FF0000'?item.color:colors.text}
                    className="mr-5 text-center"
                    style={{fontSize: scaled48}}
                  />
                  <Text minimumFontScale={0.8} ellipsizeMode="tail" className={`font-bold text-center`} style={{color: item.color=='#FF0000'?item.color:colors.text, fontSize: scaledFontSize, marginRight:10}}>
                    {t(item.textKey)}
                  </Text>
                </Pressable>
              );
            }}
            ListFooterComponent={
              <View style={{ marginTop: 20, paddingHorizontal: 5 }}>
                {biometricAvailable && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('biometricLock')}</Text>
                      <Text style={{ color: colors.subtext, fontSize: 13, marginTop: 2 }}>{t('biometricLockDescription')}</Text>
                    </View>
                    <Switch
                      value={biometricEnabled}
                      onValueChange={(v) => { toggleBiometric(v); }}
                      trackColor={{ false: '#767577', true: '#4A90D9' }}
                      thumbColor={biometricEnabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                )}
                <View className="items-center mb-2.5">
                  <Text className="font-bold text-center" style={{ color: colors.text, fontSize: scaledFontSize }}>
                    — {t('adeConsult')} —
                  </Text>
                </View>
                {adeConnected ? (
                  <Text style={{ color: '#4CAF50', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
                    {t('adeConnected')}
                  </Text>
                ) : (
                  <View>
                    <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 8 }}>
                      {t('adeCasDescription')}
                    </Text>
                    <TextInput
                      placeholder={t('adeCasPlaceholder')}
                      placeholderTextColor={colors.subtext}
                      value={adeUser}
                      onChangeText={setAdeUser}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 12,
                        color: colors.text,
                        marginBottom: 10,
                        fontSize: 14,
                      }}
                    />
                    <TextInput
                      placeholder={t('adeCasPassword')}
                      placeholderTextColor={colors.subtext}
                      value={adePass}
                      onChangeText={setAdePass}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: 12,
                        color: colors.text,
                        marginBottom: 10,
                        fontSize: 14,
                      }}
                    />
                    <Pressable
                      onPress={handleAdeLogin}
                      disabled={adeLoading}
                      style={{
                        backgroundColor: adeLoading ? '#666' : '#4A90D9',
                        borderRadius: 8,
                        padding: 14,
                        alignItems: 'center',
                      }}
                    >
                      {adeLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                          {t('adeConnect')}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
