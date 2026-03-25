/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Keyboard, Platform, Image, ScrollView, Text, Alert, StyleSheet, Modal, ActivityIndicator, FlatList } from 'react-native';
import { Plus, Mic, Send, ChevronUp, ChevronDown, LayoutGrid, Square, X, MessageSquare } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import IntegrationsMenu from './IntegrationsMenu';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { TranslationKey } from '../i18n';
import { useChatStore, Attachment } from '../store/chatStore';
import { chatService } from '../services/chatService';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';

interface InputBarProps {
  t?: (key: TranslationKey) => string;
}

export default function InputBar({ t = (k) => k }: InputBarProps) {
  const [inputText, setInputText] = useState('');
  const [isIntegrationsVisible, setIsIntegrationsVisible] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const [isChatPickerVisible, setIsChatPickerVisible] = useState(false);
  const [chatList, setChatList] = useState<any[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const expandedInputRef = useRef<TextInput>(null);
  const normalInputRef = useRef<TextInput>(null);
  const isExpandingRef = useRef(false);

  const sendMessage = useChatStore((state) => state.sendMessage);
  const isTyping = useChatStore((state) => state.isTyping);
  const stopGeneration = useChatStore((state) => state.stopGeneration);
  const webSearchEnabled = useChatStore((state) => state.webSearchEnabled);
  const codeInterpreterEnabled = useChatStore((state) => state.codeInterpreterEnabled);
  const setWebSearchEnabled = useChatStore((state) => state.setWebSearchEnabled);
  const setCodeInterpreterEnabled = useChatStore((state) => state.setCodeInterpreterEnabled);
  const attachments = useChatStore((state) => state.attachments);
  const addAttachment = useChatStore((state) => state.addAttachment);
  const removeAttachment = useChatStore((state) => state.removeAttachment);
  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors, resolved } = useResolvedTheme(themeMode);
  const isDark = resolved === 'dark';
  const { showActionSheetWithOptions } = useActionSheet();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (isExpandingRef.current) {
        isExpandingRef.current = false;
        return;
      }
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      setIsExpanded(false);
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleExpand = () => {
    isExpandingRef.current = true;
    setIsExpanded(true);
    setTimeout(() => expandedInputRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    isExpandingRef.current = true;
    setIsExpanded(false);
    setTimeout(() => normalInputRef.current?.focus(), 100);
  };

  const handleAction = () => {
    if (isTyping) {
      stopGeneration();
    } else if (inputText.trim().length > 0 || attachments.length > 0) {
      sendMessage(inputText.trim());
      setInputText('');
      if (isExpanded) handleCollapse();
    }
  };

  const handlePlusPress = () => {
    const options = [t('actionCamera'), t('actionPhoto'), t('actionFile'), t('actionReferenceChat'), t('cancel')];
    showActionSheetWithOptions(
      { options, cancelButtonIndex: 4 },
      (index) => {
        switch (index) {
          case 0: handleCamera(); break;
          case 1: handlePickImage(); break;
          case 2: handlePickFile(); break;
          case 3: handleReferenceChat(); break;
        }
      }
    );
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('permissionRequired'), t('cameraPermission')); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        addAttachment({ type: 'image', uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', base64: a.base64 || undefined });
      }
    } catch (e) { console.error('Erreur caméra:', e); }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t('permissionRequired'), t('galleryPermission')); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true, allowsMultipleSelection: true, selectionLimit: 5 });
      if (!result.canceled) {
        result.assets.forEach((a) => {
          addAttachment({ type: 'image', uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', base64: a.base64 || undefined });
        });
      }
    } catch (e) { console.error('Erreur galerie:', e); }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
      if (!result.canceled && result.assets) {
        result.assets.forEach((a) => {
          addAttachment({ type: 'file', uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream' });
        });
      }
    } catch (e) { console.error('Erreur fichier:', e); }
  };

  const handleReferenceChat = async () => {
    setLoadingModal(true);
    setIsChatPickerVisible(true);
    try {
      const data = await chatService.getHistory(1);
      setChatList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erreur history:', e);
      setChatList([]);
    }
    setLoadingModal(false);
  };

  const handleSelectChat = (chat: any) => {
    setIsChatPickerVisible(false);
    useChatStore.getState().setCurrentChatId(chat.id);
  };

  //     Expanded mode    
  if (isExpanded) {
    return (
      <View style={[s.expandedContainer, { paddingBottom: keyboardHeight, backgroundColor: colors.bg }]}>
        {attachments.length > 0 && <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />}
        <TextInput
          ref={expandedInputRef}
          placeholder={t('expandedPlaceholder')}
          placeholderTextColor={colors.subtext}
          multiline scrollEnabled
          style={[s.expandedInput, { color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
        />
        <View style={[s.expandedActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={handleCollapse} style={[s.collapseBtn, { backgroundColor: colors.card }]}>
            <ChevronDown color={colors.subtext} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAction}
            style={[s.sendBtnExpanded, (inputText.trim().length > 0 || attachments.length > 0) ? s.sendActive : isTyping ? s.sendStop : s.sendInactive]}
          >
            {isTyping ? <Square color="#FFF" fill="#FFF" size={18} /> : <Send color={(inputText.trim().length > 0 || attachments.length > 0) ? "#fff" : "#999"} size={20} />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  //     Normal mode    
  return (
    <View style={[s.container, { paddingBottom: isKeyboardVisible ? 4 : 32, backgroundColor: colors.bg }]}>
      <IntegrationsMenu
        visible={isIntegrationsVisible}
        onClose={() => setIsIntegrationsVisible(false)}
        webSearchEnabled={webSearchEnabled}
        codeInterpreterEnabled={codeInterpreterEnabled}
        onToggleWebSearch={setWebSearchEnabled}
        onToggleCodeInterpreter={setCodeInterpreterEnabled}
        t={t}
      />

      {/* Modal Reference Chat */}
      <ListPickerModal
        visible={isChatPickerVisible}
        title={t('selectConversation')}
        loading={loadingModal}
        items={chatList}
        emptyText={t('noConversation')}
        onSelect={handleSelectChat}
        onClose={() => setIsChatPickerVisible(false)}
        renderLabel={(item) => item.title || t('untitledConversation')}
        icon={<MessageSquare color="#007AFF" size={18} />}
      />

      {attachments.length > 0 && <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />}
      <View style={[s.inputRow, { backgroundColor: isDark ? '#1C1C23' : '#F7F7F7', borderColor: colors.border }]}>
        <TouchableOpacity onPress={handlePlusPress} style={[s.plusBtn, { backgroundColor: isDark ? '#2C2C35' : '#E5E5E5' }]}>
          <Plus color={colors.text} size={22} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsIntegrationsVisible(true)}
          style={[s.integBtn, (webSearchEnabled || codeInterpreterEnabled) && (isDark ? s.integActiveDark : s.integActive)]}
        >
          <LayoutGrid color={(webSearchEnabled || codeInterpreterEnabled) ? '#007AFF' : colors.subtext} size={20} />
        </TouchableOpacity>
        <TextInput
          ref={normalInputRef}
          placeholder={t('placeholder')}
          placeholderTextColor={colors.subtext}
          multiline
          style={[s.textInput, { color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
        />
        {isKeyboardVisible && (
          <TouchableOpacity onPress={handleExpand} style={{ padding: 4, marginBottom: 2, marginRight: 4 }}>
            <ChevronUp color={colors.subtext} size={20} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actionBtn, isTyping && s.stopBtn]} onPress={handleAction}>
          {isTyping ? (
            <Square color="#FFF" fill="#FFF" size={18} />
          ) : (inputText.trim().length > 0 || attachments.length > 0) ? (
            <Send color="#007AFF" size={22} />
          ) : (
            <Mic color={colors.subtext} size={22} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ListPickerModal({ visible, title, loading, items, emptyText, onSelect, onClose, renderLabel, icon }: {
  visible: boolean; title: string; loading: boolean; items: any[]; emptyText: string;
  onSelect: (item: any) => void; onClose: () => void; renderLabel: (item: any) => string; icon: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 34 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
              <X color="#666" size={18} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : items.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, color: '#999' }}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item, i) => item.id || String(i)}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F4FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    {icon}
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, color: '#333' }} numberOfLines={2}>{renderLabel(item)}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

//     Attachment Preview    
function AttachmentPreview({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (uri: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8, paddingHorizontal: 4 }} contentContainerStyle={{ gap: 8 }}>
      {attachments.map((att, i) => (
        <View key={att.uri + i} style={{ position: 'relative' }}>
          {att.type === 'image' ? (
            <View style={s.thumbWrap}>
              <Image source={{ uri: att.uri }} style={s.thumbImg} resizeMode="cover" />
            </View>
          ) : (
            <View style={s.filePreview}>
              <Text style={s.fileName} numberOfLines={2}>{att.name}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => onRemove(att.uri)} style={s.removeBtn}>
            <X color="#FFF" size={10} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  integBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4
  },
  integActive: {
    backgroundColor: '#E8F0FE'
  },
  integActiveDark: {
    backgroundColor: 'rgba(0,122,255,0.2)'
  },
  textInput: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 36,
    maxHeight: 80,
    textAlignVertical: 'center' as any
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  stopBtn: {
    backgroundColor: '#EF4444'
  },
  expandedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50
  },
  expandedInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    fontSize: 16,
    lineHeight: 26,
    textAlignVertical: 'top' as any
  },
  expandedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  sendBtnExpanded: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20
  },
  sendActive: {
    backgroundColor: '#007AFF'
  },
  sendStop: {
    backgroundColor: '#EF4444'
  },
  sendInactive: {
    backgroundColor: '#E5E5E5'
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5'
  },
  thumbImg: {
    width: '100%',
    height: '100%'
  },
  filePreview: {
    height: 64,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileName: {
    fontSize: 11,
    color: '#666',
    maxWidth: 80
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center'
  },
});