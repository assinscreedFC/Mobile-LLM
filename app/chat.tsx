/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, FlatList, Text, useWindowDimensions,
  Platform, TouchableOpacity, TextInput, Keyboard, StyleSheet, KeyboardAvoidingView
} from 'react-native';
import { Copy, RefreshCw, Pencil, Volume2, Check, X, VolumeX, MessageCircle } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import Header from '../components/Header';
import InputBar from '../components/InputBar';
import ChatControlsPanel from '../components/ChatControlsPanel';
import { useI18n } from '../i18n';
import { useChatStore, Message } from '../store/chatStore';
import { useShallow } from 'zustand/react/shallow';
import { buildConversation, getDisplayText, getImageUrls } from '../utils/messageHelpers';
import MessageBubble from '../components/MessageBubble';
import { useSettingsStore } from '../store/useSettingsStore';
import { useResolvedTheme } from '../utils/theme';
import { useNotifications } from '../hooks/useNotifications';
import { router } from 'expo-router';
import { biometricService, biometricSession } from '../services/biometricService';
import { useDeepLink } from '../hooks/useDeepLink';

const ActionBtn = React.memo(({ icon: Icon, size = 15, color = '#AAA', onPress }: {
  icon: any; size?: number; color?: string; onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.5} style={cs.actionBtnTouch}>
    <Icon color={color} size={size} />
  </TouchableOpacity>
));

export default function ChatScreen() {
  const { t } = useI18n();
  useNotifications();
  useDeepLink();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Biometric lock: redirect to biometric-lock screen if enabled and not yet verified
  useEffect(() => {
    if (biometricSession.isVerified()) return;
    (async () => {
      const enabled = await biometricService.isEnabled();
      if (enabled) {
        router.replace('/biometric-lock');
      }
    })();
  }, []);

  const activeModels = useChatStore((state) => state.activeModels);
  const userMessages = useChatStore((state) => state.userMessages);
  const modelResponses = useChatStore((state) => state.modelResponses);
  const isTyping = useChatStore((state) => state.isTyping);

  const [isChatControlsVisible, setIsChatControlsVisible] = useState(false);

  const systemPrompt = useChatStore((state) => state.systemPrompt);
  const setSystemPrompt = useChatStore((state) => state.setSystemPrompt);
  const setParam = useChatStore((state) => state.setParam);
  const llmParams = useChatStore(useShallow((state) => ({
    temperature: state.temperature, maxTokens: state.maxTokens, topK: state.topK, topP: state.topP,
    minP: state.minP, frequencyPenalty: state.frequencyPenalty, presencePenalty: state.presencePenalty,
    repeatPenalty: state.repeatPenalty, repeatLastN: state.repeatLastN,
    mirostat: state.mirostat, mirostatEta: state.mirostatEta, mirostatTau: state.mirostatTau,
    tfsZ: state.tfsZ, seed: state.seed, stop: state.stop,
    numCtx: state.numCtx, numBatch: state.numBatch, numKeep: state.numKeep,
    think: state.think, streamResponse: state.streamResponse,
  })));

  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const themeMode = useSettingsStore(state => state.themeMode);
  const { colors } = useResolvedTheme(themeMode);

  const scrollRefs = useRef<Record<string, FlatList | null>>({});

  const scrollToBottom = useCallback((animated = true) => {
    const currentModel = activeModels[currentIndex];
    if (!currentModel) return;
    if (scrollRefs.current[currentModel]) {
      setTimeout(() => { scrollRefs.current[currentModel]?.scrollToEnd({ animated }); }, 30);
    }
  }, [currentIndex, activeModels]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => scrollToBottom(true));
    return () => sub.remove();
  }, [scrollToBottom]);

  useEffect(() => {
    if (isTyping) scrollToBottom(false);
  }, [modelResponses, isTyping, scrollToBottom]);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = useCallback(async (msgId: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedMsgId(msgId);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedMsgId(null), 1500);
  }, []);

  useEffect(() => {
    return () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); };
  }, []);

  const handleReadAloud = useCallback(async (msgId: string, text: string) => {
    try {
      if (speakingMsgId === msgId) { await Speech.stop(); setSpeakingMsgId(null); return; }
      await Speech.stop();
      setSpeakingMsgId(msgId);
      Speech.speak(text, {
        onDone: () => setSpeakingMsgId(null),
        onStopped: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null),
      });
    } catch (e) { setSpeakingMsgId(null); }
  }, [speakingMsgId]);

  const handleConfirmEdit = useCallback(() => {
    if (!editingMsgId || !editText.trim()) return;
    useChatStore.getState().editAndResend(editingMsgId, editText.trim());
    setEditingMsgId(null);
    setEditText('');
  }, [editingMsgId, editText]);

  const handleRegenerate = useCallback((assistantMsgId: string, modelName: string) => {
    // Use substring instead of replace to safely strip the `${modelName}-` prefix,
    // even when modelName itself contains dashes (e.g. "athene-v2:latest")
    const userMsgId = assistantMsgId.substring(modelName.length + 1);
    if (userMsgId) {
      useChatStore.getState().regenerateResponse(userMsgId);
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={[cs.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Header
        currentIndex={currentIndex}
        onOpenChatControls={() => setIsChatControlsVisible(true)}
        t={t}
      />

      <FlatList
        data={activeModels}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"

        renderItem={({ item: modelName }) => {
          const responses = modelResponses[modelName] || {};
          const conversation = buildConversation(userMessages, responses, modelName);

          const reversedConversation = [...conversation].reverse();

          if (conversation.length === 0) {
            return (
              <View style={{ width, flex: 1 }}>
                <View style={cs.emptyState}>
                  <MessageCircle size={48} color={colors.subtext} />
                  <Text style={[cs.emptyText, { color: colors.subtext }]}>{t('askQuestion')}</Text>
                </View>
              </View>
            );
          }

          return (
            <View style={{ width, flex: 1 }}>
              <FlatList
                data={reversedConversation}
                inverted={true}
                keyExtractor={(msg) => msg.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={7}

                renderItem={({ item: msg }) => {
                  const isUser = msg.role === 'user';
                  const isEditing = editingMsgId === msg.id;
                  const isCopied = copiedMsgId === msg.id;
                  const displayText = getDisplayText(msg.content);
                  const images = getImageUrls(msg.content);

                  return (
                    <View style={{ marginTop: 24 }}>
                      {/* Images rendered outside the bubble for cleaner look */}
                      {isUser && images.length > 0 && !isEditing && (
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: displayText ? 6 : 0 }}>
                          <MessageBubble content="" isUser={true} images={images} />
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                        <View style={isUser ? (displayText ? cs.userBubble : cs.userBubbleNoText) : cs.aiBubble}>
                          {isEditing ? (
                            <View>
                              <TextInput autoFocus multiline value={editText} onChangeText={setEditText} style={cs.editInput} />
                              <View style={cs.editActions}>
                                <TouchableOpacity onPress={() => setEditingMsgId(null)} style={cs.editBtn}><X color="#fff" size={16} /></TouchableOpacity>
                                <TouchableOpacity onPress={handleConfirmEdit} style={[cs.editBtn, { backgroundColor: 'rgba(255,255,255,0.35)' }]}><Check color="#fff" size={16} /></TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <MessageBubble content={displayText} isUser={isUser} images={isUser ? [] : images} />
                          )}
                        </View>
                      </View>

                      {!isEditing && (
                        <View style={[cs.actionsRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
                          {isUser ? (
                            <>
                              <ActionBtn icon={Pencil} onPress={() => { setEditingMsgId(msg.id); setEditText(displayText); }} />
                              <ActionBtn icon={isCopied ? Check : Copy} color={isCopied ? '#34C759' : '#AAA'} onPress={() => handleCopy(msg.id, displayText)} />
                            </>
                          ) : (
                            <>
                              <ActionBtn icon={isCopied ? Check : Copy} color={isCopied ? '#34C759' : '#AAA'} onPress={() => handleCopy(msg.id, displayText)} />
                              <ActionBtn icon={RefreshCw} onPress={() => handleRegenerate(msg.id, modelName)} />
                              <ActionBtn icon={speakingMsgId === msg.id ? VolumeX : Volume2} color={speakingMsgId === msg.id ? '#007AFF' : '#AAA'} onPress={() => handleReadAloud(msg.id, displayText)} />
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            </View>
          );
        }}
      />

      <InputBar t={t} />

      <ChatControlsPanel
        visible={isChatControlsVisible}
        onClose={() => setIsChatControlsVisible(false)}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        params={llmParams}
        onParamChange={setParam}
        t={t}
      />
    </KeyboardAvoidingView>
  );
}

const cs = StyleSheet.create({
  flex: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, opacity: 0.3 },
  emptyText: { fontSize: 18, marginTop: 16 },
  userBubble: { backgroundColor: '#007AFF', padding: 16, borderRadius: 24, maxWidth: '85%' },
  userBubbleNoText: { maxWidth: '85%' },
  aiBubble: { maxWidth: '100%', paddingRight: 4 },
  editInput: { fontSize: 16, color: '#fff', minHeight: 40 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 },
  editBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 4 },
  actionBtnTouch: { padding: 6, marginRight: 4 },
});
