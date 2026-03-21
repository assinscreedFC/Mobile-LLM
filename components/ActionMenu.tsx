/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Camera, Image, Paperclip, MessageSquare, ChevronRight } from 'lucide-react-native';
import { TranslationKey } from '../i18n';

interface ActionMenuItem {
  icon: any;
  labelKey: TranslationKey;
  action: string;
}

const menuItems: ActionMenuItem[] = [
  { icon: Camera, labelKey: 'actionCamera', action: 'camera' },
  { icon: Image, labelKey: 'actionPhoto', action: 'image' },
  { icon: Paperclip, labelKey: 'actionFile', action: 'file' },
  { icon: MessageSquare, labelKey: 'actionReferenceChat', action: 'reference' },
];

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onCamera?: () => void;
  onPickImage?: () => void;
  onPickFile?: () => void;
  onReferenceChat?: () => void;
  t?: (key: TranslationKey) => string;
}

export default function ActionMenu({
  visible,
  onClose,
  onCamera,
  onPickImage,
  onPickFile,
  onReferenceChat,
  t = (k) => k,
}: ActionMenuProps) {

  const handlePress = (action: string) => {
    onClose();
    setTimeout(() => {
      switch (action) {
        case 'camera': onCamera?.(); break;
        case 'image': onPickImage?.(); break;
        case 'file': onPickFile?.(); break;
        case 'reference': onReferenceChat?.(); break;
      }
    }, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[s.menuItem, index < menuItems.length - 1 && s.menuItemBorder]}
              onPress={() => handlePress(item.action)}
              activeOpacity={0.6}
            >
              <View style={s.menuItemLeft}>
                <item.icon color="#000" size={20} strokeWidth={1.5} />
                <Text style={s.menuItemText}>{t(item.labelKey)}</Text>
              </View>
              <ChevronRight color="#CCC" size={16} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menu: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 4,
    paddingHorizontal: 4,
    width: 256,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
});
