/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { biometricService, biometricSession } from '../services/biometricService';
import { useI18n } from '../i18n';

export default function BiometricLockScreen() {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  const authenticate = async () => {
    setFailed(false);
    const success = await biometricService.authenticate(t('biometricPrompt'));
    if (success) {
      biometricSession.markVerified();
      router.replace('/chat');
    } else {
      setFailed(true);
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <View style={styles.container}>
      <Ionicons name="finger-print" size={80} color="#007AFF" />
      <Text style={styles.title}>{t('biometricTitle')}</Text>
      <Text style={styles.subtitle}>{t('biometricSubtitle')}</Text>
      {failed && (
        <>
          <Text style={styles.error}>{t('biometricFailed')}</Text>
          <Pressable style={styles.retryBtn} onPress={authenticate}>
            <Text style={styles.retryText}>{t('biometricRetry')}</Text>
          </Pressable>
          <Pressable style={styles.passwordBtn} onPress={() => router.replace('/sign-in')}>
            <Text style={styles.passwordText}>{t('biometricUsePassword')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0B0F', padding: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 24 },
  subtitle: { fontSize: 15, color: '#888', marginTop: 8, textAlign: 'center' },
  error: { fontSize: 14, color: '#EF4444', marginTop: 24 },
  retryBtn: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 16 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  passwordBtn: { marginTop: 12 },
  passwordText: { color: '#007AFF', fontSize: 14 },
});
