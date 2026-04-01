/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Switch } from 'react-native';
import { X, ChevronDown, ChevronRight, Info, Zap, Thermometer, Box, FileText, CheckCircle2, Circle, SlidersHorizontal, Target, Hash, Repeat, Brain, Settings2 } from 'lucide-react-native';
import { TranslationKey } from '../i18n';
import type { LLMParams } from '../store/slices/settingsSlice';

interface ChatControlsPanelProps {
    visible: boolean;
    onClose: () => void;
    systemPrompt: string;
    onSystemPromptChange: (text: string) => void;
    params: LLMParams;
    onParamChange: <K extends keyof LLMParams>(key: K, value: LLMParams[K]) => void;
    t: (key: TranslationKey) => string;
}

// ─── Reusable param row ────────────────────────────────────────
function ParamRow({ label, subtitle, icon, iconBg, iconColor, expanded, onToggle, children }: {
    label: string; subtitle: string;
    icon: React.ReactNode; iconBg: string; iconColor?: string;
    expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA]">
            <TouchableOpacity onPress={onToggle} className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center`} style={{ backgroundColor: iconBg }}>
                        {icon}
                    </View>
                    <View>
                        <Text className="text-[15px] font-semibold text-[#333]">{label}</Text>
                        <Text className="text-[13px] text-[#666]">{subtitle}</Text>
                    </View>
                </View>
                {expanded ? <ChevronDown color="#666" size={20} /> : <ChevronRight color="#666" size={20} />}
            </TouchableOpacity>
            {expanded && (
                <View className="mt-4 pt-4 border-t border-[#E5E5E5]">{children}</View>
            )}
        </View>
    );
}

function Presets({ values, current, onSelect, color, compare }: {
    values: number[]; current: number; onSelect: (v: number) => void;
    color: string; compare?: (a: number, b: number) => boolean;
}) {
    const isActive = compare || ((a: number, b: number) => a === b);
    return (
        <View className="flex-row justify-between mb-4">
            {values.map((v) => (
                <TouchableOpacity key={v} onPress={() => onSelect(v)}
                    className={`flex-1 items-center py-2 mx-1 rounded-lg border`}
                    style={{ backgroundColor: isActive(current, v) ? color : '#fff', borderColor: isActive(current, v) ? color : '#E5E5E5' }}>
                    <Text className="text-[13px] font-medium" style={{ color: isActive(current, v) ? '#fff' : '#333' }}>{v}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function NumInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <TextInput value={value} onChangeText={onChange} keyboardType="numeric" placeholder={placeholder} placeholderTextColor="#999"
            className="bg-white border border-[#E0E0E0] rounded-lg p-2 text-center font-semibold text-[#333]" />
    );
}

function SliderBar({ value, max, color }: { value: number; max: number; color: string }) {
    return (
        <View className="flex-row items-center gap-4 mb-3">
            <Text className="text-[13px] text-[#999]">0</Text>
            <View className="flex-1 h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
            </View>
            <Text className="text-[13px] text-[#999]">{max}</Text>
        </View>
    );
}

function HelpText({ text }: { text: string }) {
    return <Text className="mt-2 text-[12px] text-[#999] text-center">{text}</Text>;
}

// ─── Nullable number param helper ──────────────────────────────
function nullableStr(v: number | null): string { return v != null ? String(v) : ''; }
function parseNullableInt(t: string): number | null { const v = parseInt(t); return isNaN(v) ? null : v; }
function parseNullableFloat(t: string): number | null { const v = parseFloat(t); return isNaN(v) ? null : v; }

// ─── Main component ────────────────────────────────────────────
export default function ChatControlsPanel({
    visible, onClose, systemPrompt, onSystemPromptChange, params, onParamChange, t,
}: ChatControlsPanelProps) {
    const [activeTab, setActiveTab] = useState<'parameters' | 'system' | 'advanced'>('parameters');
    const [expanded, setExpanded] = useState<string>('');
    const toggle = (s: string) => setExpanded(expanded === s ? '' : s);

    const approx = (a: number, b: number) => Math.abs(a - b) < 0.05;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 justify-end bg-black/50">
                <Pressable className="flex-1" onPress={onClose} />

                <View className="bg-white rounded-t-[24px] h-[85%] shadow-lg shadow-black/20 overflow-hidden">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
                        <Text className="text-[18px] font-bold text-[#111]">{t('chatControls')}</Text>
                        <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F5] items-center justify-center">
                            <X color="#666" size={20} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row px-5 pt-4 pb-2">
                        {(['parameters', 'advanced', 'system'] as const).map((tab) => (
                            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
                                className={`mr-5 pb-2 border-b-2 ${activeTab === tab ? 'border-[#007AFF]' : 'border-transparent'}`}>
                                <Text className={`text-[14px] font-medium ${activeTab === tab ? 'text-[#007AFF]' : 'text-[#666]'}`}>
                                    {tab === 'parameters' ? t('parameters') : tab === 'advanced' ? t('advancedSettings') : t('systemPrompt')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
                        {/* ═══ TAB: Parameters ═══ */}
                        {activeTab === 'parameters' && (
                            <View className="gap-4">
                                {/* Stream toggle */}
                                <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA] flex-row items-center justify-between">
                                    <Text className="text-[15px] font-semibold text-[#333]">{t('streamResponse')}</Text>
                                    <Switch value={params.streamResponse} onValueChange={(v) => onParamChange('streamResponse', v)} trackColor={{ true: '#007AFF' }} />
                                </View>

                                {/* Temperature */}
                                <ParamRow label={t('temperature')}
                                    subtitle={`${params.temperature.toFixed(1)} - ${params.temperature < 0.5 ? t('precise') : params.temperature > 0.9 ? t('creative') : t('balanced')}`}
                                    icon={<Thermometer color="#007AFF" size={18} />} iconBg="#E8F0FE"
                                    expanded={expanded === 'temp'} onToggle={() => toggle('temp')}>
                                    <Presets values={[0.2, 0.7, 1.2]} current={params.temperature} onSelect={(v) => onParamChange('temperature', v)} color="#007AFF" compare={approx} />
                                    <SliderBar value={params.temperature} max={2} color="#007AFF" />
                                    <NumInput value={params.temperature.toString()} onChange={(t) => { const v = parseFloat(t); if (!isNaN(v) && v >= 0 && v <= 2) onParamChange('temperature', v); }} />
                                </ParamRow>

                                {/* Max Tokens */}
                                <ParamRow label={t('maxTokens')} subtitle={`${params.maxTokens} ${t('tokens')}`}
                                    icon={<Box color="#FF9500" size={18} />} iconBg="#FFF0E6"
                                    expanded={expanded === 'maxTok'} onToggle={() => toggle('maxTok')}>
                                    <Presets values={[1024, 2048, 4096]} current={params.maxTokens} onSelect={(v) => onParamChange('maxTokens', v)} color="#FF9500" />
                                    <NumInput value={params.maxTokens.toString()} onChange={(t) => { const v = parseInt(t); if (!isNaN(v) && v > 0) onParamChange('maxTokens', v); }} />
                                    <HelpText text={t('maxTokensInfo')} />
                                </ParamRow>

                                {/* Top K */}
                                <ParamRow label="Top K" subtitle={`${params.topK}`}
                                    icon={<Target color="#4CAF50" size={18} />} iconBg="#E8F5E9"
                                    expanded={expanded === 'topK'} onToggle={() => toggle('topK')}>
                                    <Presets values={[10, 40, 100]} current={params.topK} onSelect={(v) => onParamChange('topK', v)} color="#4CAF50" />
                                    <NumInput value={params.topK.toString()} onChange={(t) => { const v = parseInt(t); if (!isNaN(v) && v > 0) onParamChange('topK', v); }} />
                                    <HelpText text={t('topKInfo')} />
                                </ParamRow>

                                {/* Top P */}
                                <ParamRow label="Top P" subtitle={`${params.topP.toFixed(2)}`}
                                    icon={<SlidersHorizontal color="#9C27B0" size={18} />} iconBg="#F3E5F5"
                                    expanded={expanded === 'topP'} onToggle={() => toggle('topP')}>
                                    <Presets values={[0.5, 0.9, 1.0]} current={params.topP} onSelect={(v) => onParamChange('topP', v)} color="#9C27B0" compare={approx} />
                                    <SliderBar value={params.topP} max={1} color="#9C27B0" />
                                    <NumInput value={params.topP.toString()} onChange={(t) => { const v = parseFloat(t); if (!isNaN(v) && v >= 0 && v <= 1) onParamChange('topP', v); }} />
                                    <HelpText text={t('topPInfo')} />
                                </ParamRow>

                                {/* Min P */}
                                <ParamRow label="Min P" subtitle={params.minP != null ? `${params.minP}` : t('disabled')}
                                    icon={<Target color="#FF5722" size={18} />} iconBg="#FBE9E7"
                                    expanded={expanded === 'minP'} onToggle={() => toggle('minP')}>
                                    <Presets values={[0.01, 0.05, 0.1]} current={params.minP ?? -1} onSelect={(v) => onParamChange('minP', v)} color="#FF5722" compare={approx} />
                                    <NumInput value={nullableStr(params.minP)} onChange={(t) => onParamChange('minP', parseNullableFloat(t))} placeholder={t('disabled')} />
                                    <HelpText text={t('minPInfo')} />
                                </ParamRow>

                                {/* Seed */}
                                <ParamRow label="Seed" subtitle={params.seed != null ? `${params.seed}` : t('random')}
                                    icon={<Hash color="#795548" size={18} />} iconBg="#EFEBE9"
                                    expanded={expanded === 'seed'} onToggle={() => toggle('seed')}>
                                    <NumInput value={nullableStr(params.seed)} onChange={(t) => onParamChange('seed', parseNullableInt(t))} placeholder={t('random')} />
                                    <HelpText text={t('seedInfo')} />
                                </ParamRow>

                                {/* Info */}
                                <View className="bg-[#F0F7FF] p-4 rounded-xl flex-row items-start gap-3">
                                    <Info color="#007AFF" size={20} style={{ marginTop: 2 }} />
                                    <Text className="flex-1 text-[13px] text-[#004085] leading-5">{t('parametersInfo')}</Text>
                                </View>
                            </View>
                        )}

                        {/* ═══ TAB: Advanced ═══ */}
                        {activeTab === 'advanced' && (
                            <View className="gap-4">
                                {/* Frequency Penalty */}
                                <ParamRow label="Frequency Penalty" subtitle={nullableStr(params.frequencyPenalty) || t('disabled')}
                                    icon={<Repeat color="#E91E63" size={18} />} iconBg="#FCE4EC"
                                    expanded={expanded === 'freqP'} onToggle={() => toggle('freqP')}>
                                    <SliderBar value={params.frequencyPenalty ?? 0} max={2} color="#E91E63" />
                                    <NumInput value={nullableStr(params.frequencyPenalty)} onChange={(t) => onParamChange('frequencyPenalty', parseNullableFloat(t))} placeholder="0.0 - 2.0" />
                                    <HelpText text={t('frequencyPenaltyInfo')} />
                                </ParamRow>

                                {/* Presence Penalty */}
                                <ParamRow label="Presence Penalty" subtitle={nullableStr(params.presencePenalty) || t('disabled')}
                                    icon={<Repeat color="#3F51B5" size={18} />} iconBg="#E8EAF6"
                                    expanded={expanded === 'presP'} onToggle={() => toggle('presP')}>
                                    <SliderBar value={params.presencePenalty ?? 0} max={2} color="#3F51B5" />
                                    <NumInput value={nullableStr(params.presencePenalty)} onChange={(t) => onParamChange('presencePenalty', parseNullableFloat(t))} placeholder="0.0 - 2.0" />
                                    <HelpText text={t('presencePenaltyInfo')} />
                                </ParamRow>

                                {/* Repeat Penalty */}
                                <ParamRow label="Repeat Penalty" subtitle={nullableStr(params.repeatPenalty) || t('disabled')}
                                    icon={<Repeat color="#009688" size={18} />} iconBg="#E0F2F1"
                                    expanded={expanded === 'repP'} onToggle={() => toggle('repP')}>
                                    <NumInput value={nullableStr(params.repeatPenalty)} onChange={(t) => onParamChange('repeatPenalty', parseNullableFloat(t))} placeholder="1.0 - 2.0" />
                                    <HelpText text={t('repeatPenaltyInfo')} />
                                </ParamRow>

                                {/* Repeat Last N */}
                                <ParamRow label="Repeat Last N" subtitle={nullableStr(params.repeatLastN) || t('disabled')}
                                    icon={<Repeat color="#607D8B" size={18} />} iconBg="#ECEFF1"
                                    expanded={expanded === 'repN'} onToggle={() => toggle('repN')}>
                                    <Presets values={[32, 64, 128]} current={params.repeatLastN ?? -1} onSelect={(v) => onParamChange('repeatLastN', v)} color="#607D8B" />
                                    <NumInput value={nullableStr(params.repeatLastN)} onChange={(t) => onParamChange('repeatLastN', parseNullableInt(t))} placeholder="64" />
                                    <HelpText text={t('repeatLastNInfo')} />
                                </ParamRow>

                                {/* TFS Z */}
                                <ParamRow label="TFS Z" subtitle={nullableStr(params.tfsZ) || t('disabled')}
                                    icon={<SlidersHorizontal color="#FF9800" size={18} />} iconBg="#FFF3E0"
                                    expanded={expanded === 'tfsZ'} onToggle={() => toggle('tfsZ')}>
                                    <NumInput value={nullableStr(params.tfsZ)} onChange={(t) => onParamChange('tfsZ', parseNullableFloat(t))} placeholder="1.0" />
                                    <HelpText text={t('tfsZInfo')} />
                                </ParamRow>

                                {/* Stop Sequences */}
                                <ParamRow label={t('stopSequences')} subtitle={params.stop || t('none')}
                                    icon={<X color="#F44336" size={18} />} iconBg="#FFEBEE"
                                    expanded={expanded === 'stop'} onToggle={() => toggle('stop')}>
                                    <TextInput value={params.stop || ''} onChangeText={(t) => onParamChange('stop', t || null)}
                                        placeholder={t('stopPlaceholder')} placeholderTextColor="#999"
                                        className="bg-white border border-[#E0E0E0] rounded-lg p-2 text-[14px] text-[#333]" />
                                    <HelpText text={t('stopInfo')} />
                                </ParamRow>

                                {/* ── Mirostat Group ── */}
                                <Text className="text-[13px] font-bold text-[#999] uppercase mt-2">Mirostat</Text>

                                <ParamRow label="Mirostat" subtitle={params.mirostat != null ? `Mode ${params.mirostat}` : t('disabled')}
                                    icon={<Brain color="#673AB7" size={18} />} iconBg="#EDE7F6"
                                    expanded={expanded === 'miro'} onToggle={() => toggle('miro')}>
                                    <Presets values={[0, 1, 2]} current={params.mirostat ?? -1} onSelect={(v) => onParamChange('mirostat', v === 0 ? null : v)} color="#673AB7" />
                                    <HelpText text={t('mirostatInfo')} />
                                </ParamRow>

                                <ParamRow label="Mirostat Eta" subtitle={nullableStr(params.mirostatEta) || t('disabled')}
                                    icon={<Brain color="#673AB7" size={18} />} iconBg="#EDE7F6"
                                    expanded={expanded === 'miroEta'} onToggle={() => toggle('miroEta')}>
                                    <NumInput value={nullableStr(params.mirostatEta)} onChange={(t) => onParamChange('mirostatEta', parseNullableFloat(t))} placeholder="0.1" />
                                    <HelpText text={t('mirostatEtaInfo')} />
                                </ParamRow>

                                <ParamRow label="Mirostat Tau" subtitle={nullableStr(params.mirostatTau) || t('disabled')}
                                    icon={<Brain color="#673AB7" size={18} />} iconBg="#EDE7F6"
                                    expanded={expanded === 'miroTau'} onToggle={() => toggle('miroTau')}>
                                    <NumInput value={nullableStr(params.mirostatTau)} onChange={(t) => onParamChange('mirostatTau', parseNullableFloat(t))} placeholder="5.0" />
                                    <HelpText text={t('mirostatTauInfo')} />
                                </ParamRow>

                                {/* ── Ollama Group ── */}
                                <Text className="text-[13px] font-bold text-[#999] uppercase mt-2">Ollama</Text>

                                <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA] flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-8 h-8 rounded-lg bg-[#E3F2FD] items-center justify-center">
                                            <Brain color="#2196F3" size={18} />
                                        </View>
                                        <Text className="text-[15px] font-semibold text-[#333]">Think (Ollama)</Text>
                                    </View>
                                    <Switch value={params.think} onValueChange={(v) => onParamChange('think', v)} trackColor={{ true: '#2196F3' }} />
                                </View>

                                <ParamRow label="num_ctx" subtitle={nullableStr(params.numCtx) || t('default')}
                                    icon={<Settings2 color="#2196F3" size={18} />} iconBg="#E3F2FD"
                                    expanded={expanded === 'numCtx'} onToggle={() => toggle('numCtx')}>
                                    <Presets values={[2048, 4096, 8192]} current={params.numCtx ?? -1} onSelect={(v) => onParamChange('numCtx', v)} color="#2196F3" />
                                    <NumInput value={nullableStr(params.numCtx)} onChange={(t) => onParamChange('numCtx', parseNullableInt(t))} placeholder="2048" />
                                    <HelpText text={t('numCtxInfo')} />
                                </ParamRow>

                                <ParamRow label="num_batch" subtitle={nullableStr(params.numBatch) || t('default')}
                                    icon={<Settings2 color="#2196F3" size={18} />} iconBg="#E3F2FD"
                                    expanded={expanded === 'numBatch'} onToggle={() => toggle('numBatch')}>
                                    <NumInput value={nullableStr(params.numBatch)} onChange={(t) => onParamChange('numBatch', parseNullableInt(t))} placeholder="512" />
                                    <HelpText text={t('numBatchInfo')} />
                                </ParamRow>

                                <ParamRow label="num_keep" subtitle={nullableStr(params.numKeep) || t('default')}
                                    icon={<Settings2 color="#2196F3" size={18} />} iconBg="#E3F2FD"
                                    expanded={expanded === 'numKeep'} onToggle={() => toggle('numKeep')}>
                                    <NumInput value={nullableStr(params.numKeep)} onChange={(t) => onParamChange('numKeep', parseNullableInt(t))} placeholder="24" />
                                    <HelpText text={t('numKeepInfo')} />
                                </ParamRow>
                            </View>
                        )}

                        {/* ═══ TAB: System Prompt ═══ */}
                        {activeTab === 'system' && (
                            <View className="flex-1">
                                <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA] flex-1">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <FileText color="#333" size={18} />
                                        <Text className="text-[15px] font-semibold text-[#333]">{t('customSystemPrompt')}</Text>
                                    </View>
                                    <TextInput multiline value={systemPrompt} onChangeText={onSystemPromptChange}
                                        placeholder={t('systemPromptPlaceholder')} placeholderTextColor="#999"
                                        className="flex-1 bg-white border border-[#E0E0E0] rounded-xl p-3 text-[15px] leading-6 text-[#333]"
                                        style={{ textAlignVertical: 'top', minHeight: 200 }} />
                                    <View className="mt-3 flex-row justify-end">
                                        <TouchableOpacity onPress={() => onSystemPromptChange("")} className="px-3 py-1.5 bg-[#FFEBEB] rounded-lg">
                                            <Text className="text-[12px] font-medium text-[#D32F2F]">{t('clear')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View className="mt-4 bg-[#F0F7FF] p-4 rounded-xl flex-row items-start gap-3">
                                    <Info color="#007AFF" size={20} style={{ marginTop: 2 }} />
                                    <Text className="flex-1 text-[13px] text-[#004085] leading-5">{t('systemPromptInfo')}</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-5 border-t border-[#F0F0F0] bg-white">
                        <TouchableOpacity onPress={onClose} className="w-full bg-[#111] py-3.5 rounded-xl items-center">
                            <Text className="text-white font-semibold text-[16px]">{t('done')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
