/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { chatService } from '../services/chatService';
import { TranslationKey } from '../i18n';

interface ModelInfo {
  id: string;
  name: string;
  size: string;
  vision?: boolean;
}

interface ModelSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (modelName: string, vision?: boolean) => void;
  mode?: 'add' | 'switch';
  t?: (key: TranslationKey) => string;
}

export default function ModelSelector({ visible, onClose, onSelect, mode = 'add', t = (k) => k }: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch des modèles depuis l'API quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      const fetchModels = async () => {
        setLoading(true);
        try {
          const response = await chatService.getAvailableModels();
          if (Array.isArray(response)) {
            const modelList: ModelInfo[] = response.map((item: any, index: number) => {
              if (typeof item === 'string') {
                return { id: String(index), name: item, size: '' };
              }
              return {
                id: item.id || String(index),
                name: item.name || item.id || item,
                size: item.size || '',
                vision: item.vision ?? false,
              };
            });
            setModels(modelList);
          }
        } catch (error) {
          console.error('Erreur fetch modèles:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchModels();
    }
  }, [visible]);

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/10 items-center pt-24">
          <View className="bg-white rounded-2xl w-[85%] shadow-xl overflow-hidden border border-gray-100">

            {/* Titre */}
            <View className="px-4 pt-4 pb-2">
              <Text className="text-[15px] font-bold text-gray-800">
                {mode === 'switch' ? t('switchModel') : t('addModel')}
              </Text>
            </View>

            {/* Barre de recherche */}
            <View className="px-4 pb-3">
              <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <Search color="#999" size={18} />
                <TextInput
                  placeholder={t('searchModel')}
                  className="flex-1 ml-2 text-[15px]"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X color="#999" size={18} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Liste des modèles */}
            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#007AFF" />
                <Text className="text-[13px] text-gray-400 mt-2">{t('loadingModels')}</Text>
              </View>
            ) : (
              <FlatList
                data={filteredModels}
                keyExtractor={(item) => item.id}
                className="max-h-72"
                ListEmptyComponent={
                  <View className="py-8 items-center">
                    <Text className="text-[13px] text-gray-400">{t('noModelFound')}</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-row items-center justify-between p-4 border-b border-gray-50 active:bg-gray-50"
                    onPress={() => {
                      onSelect(item.name, item.vision);
                      onClose();
                      setSearchQuery('');
                    }}
                  >
                    <Text className="text-[15px] text-gray-800 flex-1" numberOfLines={1}>{item.name}</Text>
                    {item.size ? (
                      <Text className="text-[13px] text-gray-400 ml-2">{item.size}</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}