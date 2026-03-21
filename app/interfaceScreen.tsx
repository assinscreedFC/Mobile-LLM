import { SafeAreaView, View, Text, Pressable, FlatList, Switch } from 'react-native';
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
import { useUIScale } from '../utils/useUIScale'
import { useHaptics } from '../utils/useHaptics'
import { ActionSheetTrigger } from '../components/ActionSheetTrigger';

export default function InterfaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const optionsList = useInterfaceSettingsStore(state => state.optionsList);
  const setOptionsList = useInterfaceSettingsStore(state => state.setOptionsList);
  const { t } = useI18n();
  const { themeMode } = useSettingsStore()
  const { colors } = useResolvedTheme(themeMode);
  const scaledFontSize = useUIScale(24);
  const scaled48 = useUIScale(48);
  const scaleFactor = useUIScale(1);
  const { haptics } = useHaptics();


  return (
    <SafeAreaView className="flex-1" style={{ paddingTop: insets.top, paddingBottom: insets.bottom}}>
      <View className="flex-1" style={{ backgroundColor: colors.bg }}>
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
            data={Object.entries(optionsList).map(([key, value]) => ({...value, id: key,}))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              if (item.type == 'separator'){
                return (
                    <View className="items-center mt-14 mb-2">
                          <Text className="font-bold text-center" style={{ color: colors.text, fontSize: scaledFontSize }}>— {t(item.textKey)} —</Text>
                    </View>
                    );
              }
              else{
              /* item is not a separator */
              const Interactable = item.type === 'switch' ? Switch : (item.type ==='NumberInput' ? NumberInput : ActionSheetTrigger) /*TODO generalise this*/;
              let switchThumbColor = item.type === 'switch' ? (item.value? colors.accent : colors.text) : undefined;

              return (
              <View className="flex-row items-center py-2">

                <Text minimumFontScale={0.8}
                      ellipsizeMode="tail"
                      className={'text-left flex-1'}
                      style={{ color: colors.text, fontSize: scaledFontSize, marginRight:10 }}>
                     {t(item.textKey)}
                </Text>

                <Interactable
                    style = {{marginLeft: 'auto'}}
                    value={item.value}
                    {...(item.type === 'switch' ? {
                        trackColor: {
                          false: colors.subtext,
                          true: colors.subaccent
                        },
                        thumbColor: switchThumbColor,
                        onValueChange: (value) => {setOptionsList(item.id, value); haptics('medium')},
                        style: {transform: [{scale: scaleFactor}]}
                      } : (item.type==='NumberInput'?{
                        onSubmitEditing: (value) => {setOptionsList(item.id, value); haptics('medium')},
                        style: { color: colors.text, fontSize: scaledFontSize, fontWeight: 'bold', width:scaled48, height:scaled48, minWidth:36, minHeight:36 }, //without the minimas, it can get impossible to recover from scaling it down too far.
                        defaultValue: 100,
                        minValue: 9,
                        maxValue: 500
                      } : /* it is action-sheet*/ {
                          value: item.value,
                          validValues: item.validValues,
                          setter:setOptionsList, id: item.id,
                          backgroundColor:colors.subaccent,
                          style: {fontWeight: 700, fontSize: scaledFontSize*0.66, maxWidth:scaled48}
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
      </View>
    </SafeAreaView>
  );
}
