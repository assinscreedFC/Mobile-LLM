/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  FileText,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MessageSquare,
  Edit3,
  Settings,
  User
} from 'lucide-react-native';
import { useChatStore } from '../store/chatStore';
import { TranslationKey } from '../i18n';

export default function Sidebar({ visible, onClose, t = (k: string) => k }: { visible: boolean; onClose: () => void; t?: (key: TranslationKey) => string }) {
  const insets = useSafeAreaInsets();

  // --- LOGIQUE ZUSTAND ---
  const history = useChatStore((state) => state.history);
  const fetchHistory = useChatStore((state) => state.fetchHistory);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const currentChatId = useChatStore((state) => state.currentChatId);
  const setCurrentChatId = useChatStore((state) => state.setCurrentChatId);

  // --- ÉTATS LOCAUX ---
  const [expandedFolders, setExpandedFolders] = useState({ maths: true, prog: false });
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);

  // Charger l'historique quand on ouvre la barre
  useEffect(() => {
    if (visible) {
      const load = async () => {
        setLoading(true);
        await fetchHistory();
        setLoading(false);
      };
      load();
    }
  }, [visible, fetchHistory]);

  const toggleFolder = (folder) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleSearchPress = () => {
    setIsSearching(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleSelectChat = (id) => {
    setCurrentChatId(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/45" />
      </TouchableWithoutFeedback>

      <View
        style={{ top: insets.top }}
        className="absolute left-0 bottom-0 w-[82%] bg-[#FBFBFB] rounded-tr-3xl shadow-xl shadow-black z-50 overflow-hidden elevation-20"
      >
        {/* HEADER : New Chat */}
        <View className="px-5 pt-[22px] pb-[14px]">
          <TouchableOpacity
            onPress={async () => { await startNewChat(); onClose(); }}
            activeOpacity={0.85}
            className="flex-row items-center bg-[#111] py-[14px] px-5 rounded-2xl"
          >
            <Edit3 size={17} color="#FFF" />
            <Text className="ml-3 text-[15.5px] font-semibold text-white tracking-wide">{t('newChatSidebar')}</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View className="px-5 mb-2.5">
          <TouchableOpacity
            onPress={handleSearchPress}
            activeOpacity={0.7}
            className="flex-row items-center bg-[#F0F0F0] py-[11px] px-[14px] rounded-[13px]"
          >
            <Search size={17} color="#AAAAAA" />
            {isSearching ? (
              <TextInput
                ref={searchInputRef}
                placeholder={t('searchConversations')}
                placeholderTextColor="#AAA"
                className="ml-2.5 flex-1 text-[14.5px] text-[#333] p-0"
                onBlur={() => setIsSearching(false)}
                autoCapitalize="none"
              />
            ) : (
              <Text className="ml-2.5 text-[14.5px] text-[#AAAAAA]">{t('searchConversations')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        >
          {/* Quick Access */}
          <TouchableOpacity activeOpacity={0.6} className="flex-row items-center py-[13px] px-1">
            <View className="w-[34px] h-[34px] rounded-[10px] bg-[#EFEFEF] items-center justify-center">
              <FileText size={17} color="#777" />
            </View>
            <Text className="ml-[14px] text-[15.5px] text-[#444] font-medium">{t('notes')}</Text>
          </TouchableOpacity>

          <View className="h-[1px] bg-[#EBEBEB] my-1.5" />

          {/* SECTION : FOLDERS */}
          <View className="mt-2.5">
            <View className="flex-row justify-between items-center mb-2.5 px-1">
              <Text className="text-[#AAAAAA] font-bold text-[11px] tracking-[1.8px] uppercase">{t('folders')}</Text>
              <TouchableOpacity activeOpacity={0.6} className="flex-row items-center bg-[#F0F0F0] px-2.5 py-[5px] rounded-lg">
                <FolderPlus size={12} color="#999" />
                <Text className="ml-[5px] text-[11px] text-[#999] font-semibold">{t('addFolder')}</Text>
              </TouchableOpacity>
            </View>

            {/* Dossier Maths */}
            <View className="mb-0.5">
              <TouchableOpacity onPress={() => toggleFolder('maths')} className="flex-row items-center py-2.5 px-1">
                {expandedFolders.maths ? <ChevronDown size={15} color="#CCC" /> : <ChevronRight size={15} color="#CCC" />}
                <Text className="ml-2.5 text-[15px] font-semibold text-[#444]">Maths</Text>
              </TouchableOpacity>
              {expandedFolders.maths && (
                <View className="ml-3 border-l-[1.5px] border-[#E8E8E8] pl-4 mt-0.5">
                  <Text className="text-[#888] text-[14px] py-2.5">Gradient Descent...</Text>
                </View>
              )}
            </View>

            {/* Dossier Prog */}
            <View className="mb-0.5">
              <TouchableOpacity onPress={() => toggleFolder('prog')} className="flex-row items-center py-2.5 px-1">
                {expandedFolders.prog ? <ChevronDown size={15} color="#CCC" /> : <ChevronRight size={15} color="#CCC" />}
                <Text className="ml-2.5 text-[15px] font-semibold text-[#444]">Programmation</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="h-[1px] bg-[#EBEBEB] my-2.5" />

          {/* SECTION : RECENT CHATS DYNAMIQUE */}
          <View>
            <View className="flex-row justify-between items-center mb-2.5 px-1">
              <Text className="text-[#AAAAAA] font-bold text-[11px] tracking-[1.8px] uppercase">{t('recentChats')}</Text>
              {loading && <ActivityIndicator size="small" color="#AAA" />}
            </View>

            {history.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                onPress={() => handleSelectChat(chat.id)}
                activeOpacity={0.6}
                className={`flex-row items-center py-[11px] px-2 rounded-xl mb-1 ${currentChatId === chat.id ? 'bg-gray-200' : ''}`}
              >
                <View className={`w-8 h-8 rounded-[9px] items-center justify-center ${currentChatId === chat.id ? 'bg-white' : 'bg-[#F0F0F0]'}`}>
                  <MessageSquare size={14} color={currentChatId === chat.id ? "#007AFF" : "#999"} />
                </View>
                <Text
                  className={`ml-3 text-[14px] flex-1 ${currentChatId === chat.id ? 'text-black font-semibold' : 'text-[#666]'}`}
                  numberOfLines={1}
                >
                  {chat.title || t('noTitle')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* BOTTOM Bar */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 14) }} className="border-t border-[#EBEBEB] px-5 py-[14px] flex-row items-center justify-between bg-[#FBFBFB]">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-[11px] bg-[#ECECEC] items-center justify-center">
              <User size={17} color="#999" />
            </View>
            <Text className="ml-3 text-[14.5px] font-semibold text-[#444]">Anis H.</Text>
          </View>
          <Settings size={19} color="#AAAAAA" />
        </View>
      </View>
    </Modal>
  );
}

