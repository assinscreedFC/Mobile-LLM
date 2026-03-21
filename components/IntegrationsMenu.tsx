/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal, TouchableWithoutFeedback, Switch } from 'react-native';
import { Globe, Code } from 'lucide-react-native';
import { TranslationKey } from '../i18n';

interface IntegrationsMenuProps {
    visible: boolean;
    onClose: () => void;
    webSearchEnabled: boolean;
    codeInterpreterEnabled: boolean;
    onToggleWebSearch: (value: boolean) => void;
    onToggleCodeInterpreter: (value: boolean) => void;
    t?: (key: TranslationKey) => string;
}

export default function IntegrationsMenu({
    visible,
    onClose,
    webSearchEnabled,
    codeInterpreterEnabled,
    onToggleWebSearch,
    onToggleCodeInterpreter,
    t = (k) => k,
}: IntegrationsMenuProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/10">
                    <View
                        className="absolute bottom-24 left-16 bg-white rounded-2xl p-4 w-64 shadow-xl border border-gray-100"
                        style={{ elevation: 5 }}
                    >
                        {/* Titre */}
                        <Text className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3 px-1">
                            {t('integrations')}
                        </Text>

                        {/* Web Search */}
                        <View className="flex-row items-center justify-between py-3 px-1">
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                                    <Globe color="#666" size={18} />
                                </View>
                                <Text className="ml-3 text-[15px] font-medium text-gray-800">
                                    {t('webSearch')}
                                </Text>
                            </View>
                            <Switch
                                value={webSearchEnabled}
                                onValueChange={onToggleWebSearch}
                                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                                thumbColor="#FFF"
                                ios_backgroundColor="#E5E5E5"
                            />
                        </View>

                        {/* Divider */}
                        <View className="h-px bg-gray-100 mx-1" />

                        {/* Code Interpreter */}
                        <View className="flex-row items-center justify-between py-3 px-1">
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center">
                                    <Code color="#666" size={18} />
                                </View>
                                <Text className="ml-3 text-[15px] font-medium text-gray-800">
                                    {t('codeInterpreter')}
                                </Text>
                            </View>
                            <Switch
                                value={codeInterpreterEnabled}
                                onValueChange={onToggleCodeInterpreter}
                                trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
                                thumbColor="#FFF"
                                ios_backgroundColor="#E5E5E5"
                            />
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}


