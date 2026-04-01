/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal, Alert, Image } from 'react-native';
import { Menu, ChevronDown, Plus, User, Edit3, MoreVertical, SlidersHorizontal, Share2, Download, Trash2 } from 'lucide-react-native';
import ModelSelector from './ModelSelector';
import Sidebar from './Sidebar';
import { useFocusEffect, useRouter } from 'expo-router';
import { TranslationKey } from '../i18n';
import { useChatStore } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { compteService } from '../services/compteService';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';

interface HeaderProps {
  currentIndex: number;
  onOpenChatControls?: () => void;
  onExportChat?: () => void;
  t: (key: TranslationKey) => string;
}

export default function Header({
  currentIndex,
  onOpenChatControls = () => { },
  onExportChat = () => { },
  t,
}: HeaderProps) {
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isSwitchSelectorVisible, setIsSwitchSelectorVisible] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();

  const activeModels = useChatStore((state) => state.activeModels);
  const addModel = useChatStore((state) => state.addModel);
  const switchModel = useChatStore((state) => state.switchModel);
  const startNewChat = useChatStore((state) => state.startNewChat);

  const handleDeleteChat = () => {
    Alert.alert(
      t('deleteChat'),
      t('deleteChatConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteChat'),
          style: 'destructive',
          onPress: async () => {
            const currentChatId = useChatStore.getState().currentChatId;
            if (currentChatId) {
              await chatService.deleteChat(currentChatId);
            }
            startNewChat();
          },
        },
      ]
    );
  };

  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);

  const isDark = resolved === 'dark';

  const handleMenuAction = (action: () => void) => {
    setIsMoreMenuVisible(false);
    setTimeout(() => action(), 600);
  };

  const handleSwitchModel = (newModel: string, vision?: boolean) => {
    switchModel(currentIndex, newModel);
    useChatStore.getState().setModelVision(newModel, vision ?? false);
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadAvatar = async () => {
        try {
          const profile = await compteService.getProfile();

          if (isActive) {
            setAvatarUrl(profile.avatarUrl);
          }
        } catch {
          if (isActive) {
            setAvatarUrl(null);
          }
        }
      };

      loadAvatar();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <View style={{ backgroundColor: colors.bg, borderBottomColor: colors.border, borderBottomWidth: 1 }} className="mt-2 pt-12 pb-2">
      <Sidebar
        visible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        t={t}
      />

      <ModelSelector
        visible={isSelectorVisible}
        onClose={() => setIsSelectorVisible(false)}
        onSelect={(name, vision) => {
          addModel(name);
          useChatStore.getState().setModelVision(name, vision ?? false);
        }}
        mode="add"
        t={t}
      />

      <ModelSelector
        visible={isSwitchSelectorVisible}
        onClose={() => setIsSwitchSelectorVisible(false)}
        onSelect={handleSwitchModel}
        mode="switch"
        t={t}
      />

      <Modal visible={isMoreMenuVisible} transparent animationType="fade">
        <View className="flex-1">
          <Pressable
            className="absolute top-0 left-0 right-0 bottom-0 bg-black/10"
            onPress={() => setIsMoreMenuVisible(false)}
          />

          <View
            className="absolute top-[100px] right-4 rounded-2xl py-1.5 px-1 w-[200px] shadow-lg shadow-black/10 border"
            style={{ elevation: 8, backgroundColor: colors.card, borderColor: colors.border }}
          >
            <TouchableOpacity
              onPress={() => handleMenuAction(onOpenChatControls)}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <SlidersHorizontal color={colors.subtext} size={17} />
              <Text className="ml-3 text-[14px] font-medium" style={{ color: colors.text }}>
                {t('chatControls')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction(() => { })}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Share2 color={colors.subtext} size={17} />
              <Text className="ml-3 text-[14px] font-medium" style={{ color: colors.text }}>
                {t('shareChat')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction(onExportChat)}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Download color={colors.subtext} size={17} />
              <Text className="ml-3 text-[14px] font-medium" style={{ color: colors.text }}>
                {t('exportChat')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction(handleDeleteChat)}
              activeOpacity={0.6}
              className="flex-row items-center py-3 px-[14px] rounded-[10px]"
            >
              <Trash2 color="#E53935" size={17} />
              <Text className="ml-3 text-[14px] font-medium text-[#E53935]">
                {t('deleteChat')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center justify-between px-4 overflow-hidden">
        <View className="flex-1 flex-row items-center min-w-0 mr-3">
          <TouchableOpacity onPress={() => setIsSidebarVisible(true)}>
            <Menu color={colors.text} size={24} />
          </TouchableOpacity>

          <View className="ml-4 flex-1 min-w-0">
            <TouchableOpacity
              onPress={() => setIsSwitchSelectorVisible(true)}
              activeOpacity={0.6}
              className="flex-row items-center"
            >
              <Text className="text-[18px] font-bold" style={{ color: colors.text, flexShrink: 1 }} numberOfLines={1}>
                {activeModels[currentIndex] || t('model')}
              </Text>
              <ChevronDown color={colors.subtext} size={18} style={{ marginLeft: 4, flexShrink: 0 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => setIsSelectorVisible(true)}
            disabled={activeModels.length >= 4}
            style={{ opacity: activeModels.length >= 4 ? 0.3 : 1 }}
          >
            <Plus color={colors.text} size={24} />
          </TouchableOpacity>

          <TouchableOpacity onPress={startNewChat} activeOpacity={0.6} className="w-8 h-8 rounded-[10px] items-center justify-center">
            <Edit3 color="#999" size={19} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsMoreMenuVisible(true)} activeOpacity={0.6} className="w-8 h-8 rounded-[10px] items-center justify-center">
            <MoreVertical color="#999" size={19} />
          </TouchableOpacity>

          <Pressable
            onPress={() => router.push('/accountScreen')}
            className="w-9 h-9 rounded-[18px] items-center justify-center overflow-hidden"
            style={{ backgroundColor: isDark ? '#333' : '#E5E5E5' }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <User color={colors.subtext} size={20} />
            )}
          </Pressable>
        </View>
      </View>

      {activeModels.length > 1 && (
        <View className="flex-row justify-center gap-1 mt-2">
          {activeModels.map((_, i) => (
            <View
              key={i}
              className={`h-1 rounded-sm ${i === currentIndex ? 'w-4' : 'w-1'}`}
              style={{ backgroundColor: i === currentIndex ? colors.text : colors.border }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
