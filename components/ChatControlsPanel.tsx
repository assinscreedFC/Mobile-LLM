/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Pressable } from 'react-native';
import { X, ChevronDown, ChevronRight, Info, Zap, Thermometer, Box, FileText, CheckCircle2, Circle } from 'lucide-react-native';
import { TranslationKey } from '../i18n';

interface ChatControlsPanelProps {
    visible: boolean;
    onClose: () => void;
    systemPrompt: string;
    onSystemPromptChange: (text: string) => void;
    temperature: number;
    onTemperatureChange: (value: number) => void;
    maxTokens: number;
    onMaxTokensChange: (value: number) => void;
    t: (key: TranslationKey) => string;
}

export default function ChatControlsPanel({
    visible,
    onClose,
    systemPrompt,
    onSystemPromptChange,
    temperature,
    onTemperatureChange,
    maxTokens,
    onMaxTokensChange,
    t,
}: ChatControlsPanelProps) {
    const [activeTab, setActiveTab] = useState<'parameters' | 'system'>('parameters');
    const [expandedSection, setExpandedSection] = useState<'none' | 'temperature' | 'maxTokens'>('none');

    const toggleSection = (section: 'temperature' | 'maxTokens') => {
        setExpandedSection(expandedSection === section ? 'none' : section);
    };

    const tempPresets = [
        { value: 0.2, label: t('precise'), icon: <CheckCircle2 size={16} color="#007AFF" /> },
        { value: 0.7, label: t('balanced'), icon: <Circle size={16} color="#007AFF" /> },
        { value: 1.2, label: t('creative'), icon: <Zap size={16} color="#FF9500" /> },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <Pressable className="flex-1" onPress={onClose} />

                <View className="bg-white rounded-t-[24px] h-[80%] shadow-lg shadow-black/20 overflow-hidden">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
                        <Text className="text-[18px] font-bold text-[#111]">
                            {t('chatControls')}
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 rounded-full bg-[#F5F5F5] items-center justify-center"
                        >
                            <X color="#666" size={20} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View className="flex-row px-5 pt-4 pb-2">
                        <TouchableOpacity
                            onPress={() => setActiveTab('parameters')}
                            className={`mr-6 pb-2 border-b-2 ${activeTab === 'parameters' ? 'border-[#007AFF]' : 'border-transparent'}`}
                        >
                            <Text
                                className={`text-[15px] font-medium ${activeTab === 'parameters' ? 'text-[#007AFF]' : 'text-[#666]'}`}
                            >
                                {t('parameters')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setActiveTab('system')}
                            className={`mr-6 pb-2 border-b-2 ${activeTab === 'system' ? 'border-[#007AFF]' : 'border-transparent'}`}
                        >
                            <Text
                                className={`text-[15px] font-medium ${activeTab === 'system' ? 'text-[#007AFF]' : 'text-[#666]'}`}
                            >
                                {t('systemPrompt')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
                        {activeTab === 'parameters' ? (
                            <View className="gap-6">

                                {/* Temperature Control */}
                                <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA]">
                                    <TouchableOpacity
                                        onPress={() => toggleSection('temperature')}
                                        className="flex-row items-center justify-between"
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-8 h-8 rounded-lg bg-[#E8F0FE] items-center justify-center">
                                                <Thermometer color="#007AFF" size={18} />
                                            </View>
                                            <View>
                                                <Text className="text-[15px] font-semibold text-[#333]">
                                                    {t('temperature')}
                                                </Text>
                                                <Text className="text-[13px] text-[#666]">
                                                    {temperature.toFixed(1)} - {temperature < 0.5 ? t('precise') : temperature > 0.9 ? t('creative') : t('balanced')}
                                                </Text>
                                            </View>
                                        </View>
                                        {expandedSection === 'temperature' ? (
                                            <ChevronDown color="#666" size={20} />
                                        ) : (
                                            <ChevronRight color="#666" size={20} />
                                        )}
                                    </TouchableOpacity>

                                    {expandedSection === 'temperature' && (
                                        <View className="mt-4 pt-4 border-t border-[#E5E5E5]">
                                            <View className="flex-row justify-between mb-4">
                                                {tempPresets.map((preset) => (
                                                    <TouchableOpacity
                                                        key={preset.value}
                                                        onPress={() => onTemperatureChange(preset.value)}
                                                        className={`flex-1 items-center py-2 mx-1 rounded-lg border ${Math.abs(temperature - preset.value) < 0.2 ? 'bg-[#007AFF] border-[#007AFF]' : 'bg-white border-[#E5E5E5]'}`}
                                                    >
                                                        <Text
                                                            className={`text-[13px] font-medium ${Math.abs(temperature - preset.value) < 0.2 ? 'text-white' : 'text-[#333]'}`}
                                                        >
                                                            {preset.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>

                                            <View className="flex-row items-center gap-4">
                                                <Text className="text-[13px] text-[#999]">0.0</Text>
                                                <View className="flex-1 h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                                                    <View
                                                        className="h-full bg-[#007AFF] rounded-full"
                                                        style={{ width: `${(temperature / 2) * 100}%` }}
                                                    />
                                                </View>
                                                <Text className="text-[13px] text-[#999]">2.0</Text>
                                            </View>
                                            <TextInput
                                                value={temperature.toString()}
                                                onChangeText={(text) => {
                                                    const val = parseFloat(text);
                                                    if (!isNaN(val) && val >= 0 && val <= 2) onTemperatureChange(val);
                                                }}
                                                keyboardType="numeric"
                                                className="mt-3 bg-white border border-[#E0E0E0] rounded-lg p-2 text-center font-semibold text-[#333]"
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Max Tokens Control */}
                                <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA]">
                                    <TouchableOpacity
                                        onPress={() => toggleSection('maxTokens')}
                                        className="flex-row items-center justify-between"
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-8 h-8 rounded-lg bg-[#FFF0E6] items-center justify-center">
                                                <Box color="#FF9500" size={18} />
                                            </View>
                                            <View>
                                                <Text className="text-[15px] font-semibold text-[#333]">
                                                    {t('maxTokens')}
                                                </Text>
                                                <Text className="text-[13px] text-[#666]">
                                                    {maxTokens} {t('tokens')}
                                                </Text>
                                            </View>
                                        </View>
                                        {expandedSection === 'maxTokens' ? (
                                            <ChevronDown color="#666" size={20} />
                                        ) : (
                                            <ChevronRight color="#666" size={20} />
                                        )}
                                    </TouchableOpacity>

                                    {expandedSection === 'maxTokens' && (
                                        <View className="mt-4 pt-4 border-t border-[#E5E5E5]">
                                            <View className="flex-row justify-between mb-4">
                                                {[1024, 2048, 4096].map((val) => (
                                                    <TouchableOpacity
                                                        key={val}
                                                        onPress={() => onMaxTokensChange(val)}
                                                        className={`flex-1 items-center py-2 mx-1 rounded-lg border ${maxTokens === val ? 'bg-[#FF9500] border-[#FF9500]' : 'bg-white border-[#E5E5E5]'}`}
                                                    >
                                                        <Text
                                                            className={`text-[13px] font-medium ${maxTokens === val ? 'text-white' : 'text-[#333]'}`}
                                                        >
                                                            {val}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>

                                            <TextInput
                                                value={maxTokens.toString()}
                                                onChangeText={(text) => {
                                                    const val = parseInt(text);
                                                    if (!isNaN(val) && val > 0) onMaxTokensChange(val);
                                                }}
                                                keyboardType="numeric"
                                                className="bg-white border border-[#E0E0E0] rounded-lg p-2 text-center font-semibold text-[#333]"
                                            />
                                            <Text className="mt-2 text-[12px] text-[#999] text-center">
                                                {t('maxTokensInfo')}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Info Card */}
                                <View className="bg-[#F0F7FF] p-4 rounded-xl flex-row items-start gap-3">
                                    <Info color="#007AFF" size={20} style={{ marginTop: 2 }} />
                                    <Text className="flex-1 text-[13px] text-[#004085] leading-5">
                                        {t('parametersInfo')}
                                    </Text>
                                </View>

                            </View>
                        ) : (
                            <View className="flex-1">
                                <View className="bg-[#F9F9F9] rounded-[16px] p-4 border border-[#EAEAEA] flex-1">
                                    <View className="flex-row items-center gap-2 mb-3">
                                        <FileText color="#333" size={18} />
                                        <Text className="text-[15px] font-semibold text-[#333]">
                                            {t('customSystemPrompt')}
                                        </Text>
                                    </View>

                                    <TextInput
                                        multiline
                                        value={systemPrompt}
                                        onChangeText={onSystemPromptChange}
                                        placeholder={t('systemPromptPlaceholder')}
                                        placeholderTextColor="#999"
                                        className="flex-1 bg-white border border-[#E0E0E0] rounded-xl p-3 text-[15px] leading-6 text-[#333]"
                                        style={{ textAlignVertical: 'top' }}
                                    />

                                    <View className="mt-3 flex-row justify-end">
                                        <TouchableOpacity
                                            onPress={() => onSystemPromptChange("")}
                                            className="px-3 py-1.5 bg-[#FFEBEB] rounded-lg"
                                        >
                                            <Text className="text-[12px] font-medium text-[#D32F2F]">
                                                {t('clear')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View className="mt-4 bg-[#F0F7FF] p-4 rounded-xl flex-row items-start gap-3">
                                    <Info color="#007AFF" size={20} style={{ marginTop: 2 }} />
                                    <Text className="flex-1 text-[13px] text-[#004085] leading-5">
                                        {t('systemPromptInfo')}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    <View className="p-5 border-t border-[#F0F0F0] bg-white">
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-full bg-[#111] py-3.5 rounded-xl items-center"
                        >
                            <Text className="text-white font-semibold text-[16px]">
                                {t('done')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}


