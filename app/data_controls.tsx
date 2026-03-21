import { View, Text, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  Feather,
  Fontisto
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const dataControlOptions = [
  {
    id: '0',
    text: 'Import Chats',
    icon: 'import',
    lib: 'Fontisto',
    color: '#000',
    route: null,
  },
  {
    id: '1',
    text: 'Export Chats',
    icon: 'export',
    lib: 'Fontisto',
    color: '#000',
    route: null,
  },
  {
    id: '2',
    text: 'Archived Chats',
    icon: 'archive',
    lib: 'Feather',
    color: '#000',
    route: null,
  },
  {
    id: '3',
    text: 'Archive All Chats',
    icon: 'archive-outline',
    lib: 'Ionicons',
    color: '#000',
    route: null,
  },
  {
    id: '4',
    text: 'Delete All Chats',
    icon: 'trash-outline',
    lib: 'Ionicons',
    color: '#000',
    route: null,
  },
] as const;

export default function DataControlsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderIcon = (item: typeof dataControlOptions[number]) => {
    switch (item.lib) {
      case 'Feather':
        return <Feather name={item.icon} size={34} color={item.color} />;

      case 'Ionicons':
        return <Ionicons name={item.icon} size={34} color={item.color} />;

      case 'Fontisto':
        return <Fontisto name={item.icon} size={34} color={item.color} />;

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-1 bg-white px-6">
        {/* Header */}
        <View className="flex-row justify-end items-center pt-2">
          <Pressable onPress={() => router.back()} className="p-2">
            <Ionicons name="close" size={36} color="black" />
          </Pressable>
        </View>

        {/* Options */}
        <View className="pt-8 items-start">
          {dataControlOptions.map((item) => (
            <Pressable
              key={item.id}
              className="flex-row items-center py-6"
              onPress={() => {
                if (item.route) {
                  router.push(item.route);
                }
              }}
            >
              <View
                style={{
                  width: 40,
                  marginRight: 20,
                  alignItems: 'center',
                }}
              >
                {renderIcon(item)}
              </View>

              <Text className="text-[17px] font-semibold text-black">
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}