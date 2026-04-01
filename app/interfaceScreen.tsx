import { SafeAreaView, View, Text, Pressable, FlatList, Switch, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react'
import { useI18n } from "../i18n/useI18n";
import NumberInput from "../components/NumberInput";
import { useSettingsStore } from '../store/useSettingsStore';
import useInterfaceSettingsStore from '../store/interfaceSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useMemo } from 'react';
import { useUIScale } from '../hooks/useUIScale'
import { useHaptics } from '../hooks/useHaptics'
import { ActionSheetTrigger } from '../components/ActionSheetTrigger';
import { ChevronLeft } from "lucide-react-native";
import { useCommonDesign } from '../hooks/useCommonDesign';

export default function InterfaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const optionsList = useInterfaceSettingsStore(state => state.optionsList);
  const setOptionsList = useInterfaceSettingsStore(state => state.setOptionsList);
  const [draftOptionsList, setDraftOptionsList] = useState(optionsList)
  const { t } = useI18n();
  const { themeMode } = useSettingsStore()
  const { colors } = useResolvedTheme(themeMode);
  const scaled16 = useUIScale(16);
  const scaled48 = useUIScale(48);
  const scaled22 = useUIScale(22);
  const scaleFactor = useUIScale(1);
  const { haptics } = useHaptics();

  const styles = useCommonDesign();

  const updateDraftOptionsList = (id: string, newValue: any) => {
    setDraftOptionsList(prev => ({
      ...prev,
      [id]: { ...prev[id], value: newValue }
    }));
  };
  const handleSave = () => {
    Object.entries(draftOptionsList).forEach(([id, item]) => {
      setOptionsList(id, item.value);
    });
    haptics('heavy');
  };



  return (
    <SafeAreaView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom}}>
      <View className="flex-1" style={{ backgroundColor: colors.bg }}>
        {/* Back button */}
        <View className="flex-row items-center px-2.5">
          <Pressable onPress={() => {haptics('light'); router.back()}}
                     style={styles.backButton}
          >
            <ChevronLeft size={scaled22} color={colors.text} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* List of options */}
        <View style={styles.content}>
          <FlatList
            className="px-5 pt-5"
            data={Object.entries(draftOptionsList).map(([key, value]) => ({...value, id: key,}))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              if (item.type == 'separator'){
                return (
                      <Text style={styles.title}>— {t(item.textKey)} —</Text>
                    );
              }
              else{
              /* item is not a separator */
              const Interactable = item.type === 'switch' ? Switch : (item.type ==='NumberInput' ? NumberInput : ActionSheetTrigger) /*TODO generalise this*/;
              let switchThumbColor = item.type === 'switch' ? (item.value? colors.accent : colors.text) : undefined;

              return (
              <View style={styles.item}>

                <Text minimumFontScale={0.8}
                      ellipsizeMode="tail"
                      style={[styles.label, {marginRight: 10}]}>
                     {t(item.textKey)}
                </Text>

                <Interactable
                    style = {{marginLeft: 'auto'}}
                    value={item.value}
                    {...(item.type === 'switch' ? {
                        trackColor: {
                             false: colors.subtext,
                             true: colors.subaccent,
                        },
                        thumbColor: switchThumbColor,
                        onValueChange: (value) => {updateDraftOptionsList(item.id, value); haptics('medium')},
                        style: {transform: [{scale: scaleFactor}]}
                      } : (item.type==='NumberInput'?{
                        onSubmitEditing: (value) => {updateDraftOptionsList(item.id, value); haptics('medium')},
                        style: { color: colors.text, fontSize: scaled22, fontWeight: 'bold', width:scaled48, height:scaled48, minWidth:36, minHeight:36 }, //without the minimas, it can get impossible to recover from scaling it down too far.
                        defaultValue: 100,
                        minValue: 9,
                        maxValue: 500
                      } : /* it is action-sheet*/ {
                          value: item.value,
                          validValues: item.validValues,
                          setter:updateDraftOptionsList, id: item.id,
                          backgroundColor:colors.subaccent,
                          style: {fontWeight: 700, fontSize: scaled16*0.66, maxWidth:scaled48}
                        })
                      )
                    }
                    className="mr-5"
                />

              </View>
              );
              }
            }}
          />
        </View>
        <View style={[styles.footer, {marginTop: 5}]}>
            <Pressable
              style={styles.saveButton}
              onPress = {handleSave}
            >
            <Text style={styles.saveButtonText}>
                {t("generalSave")}
              </Text>
            </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
