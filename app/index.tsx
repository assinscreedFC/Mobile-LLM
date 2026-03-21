import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export default function Index() {
  useEffect(() => {
    SecureStore.getItemAsync('token').then((token) => {
      router.replace(token ? '/chat' : '/sign-in');
    });
  }, []);

  return <View style={{ flex: 1 }} />;
}
