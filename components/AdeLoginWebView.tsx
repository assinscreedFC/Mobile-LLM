/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 *
 * WebView de login ADE Consult.
 * Affiche la vraie page CAS pour que l'utilisateur se connecte.
 * Mode incognito pour forcer le login CAS a chaque fois.
 * Intercepte les credentials du formulaire CAS via JS injection,
 * puis les envoie au backend qui fait son propre login Shibboleth.
 */
import React, { useRef, useCallback, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, SafeAreaView,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { adeService } from '../services/adeService';

const ADE_PLANNING_URL = 'https://adeconsult.app.u-pariscite.fr/direct/myplanning.jsp';
const CAS_DOMAINS = ['cas.u-paris', 'auth.u-paris', 'idp.u-paris', 'cas.paris'];
const ADE_DOMAIN = 'adeconsult.app.u-pariscite.fr';

// JS injecte sur la page CAS : intercepte le submit du formulaire
const INTERCEPT_CREDENTIALS_JS = `
(function() {
  if (window.__adeIntercepted) return;
  window.__adeIntercepted = true;

  function tryIntercept() {
    var form = document.getElementById('fm1')
      || document.querySelector('form[action*="login"]')
      || document.querySelector('form[method="post"]');
    if (!form) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'debug', msg: 'Pas de formulaire trouve sur: ' + window.location.href
      }));
      return;
    }

    var userField = form.querySelector('input[name="username"]');
    var passField = form.querySelector('input[name="password"]');
    if (!userField || !passField) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'debug', msg: 'Champs username/password non trouves'
      }));
      return;
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'debug', msg: 'Formulaire CAS intercepte OK'
    }));

    form.addEventListener('submit', function() {
      var u = userField.value || '';
      var p = passField.value || '';
      if (u && p) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'credentials',
          username: u,
          password: p
        }));
      }
    });
  }

  tryIntercept();
  setTimeout(tryIntercept, 1000);
  setTimeout(tryIntercept, 3000);
})();
true;
`;

interface Props {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AdeLoginWebView({ visible, onSuccess, onCancel }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const sentRef = useRef(false);
  const currentUrlRef = useRef('');
  const credentialsRef = useRef<{ username: string; password: string } | null>(null);

  const log = (msg: string) => {
    console.log('[ADE WebView]', msg);
    setDebugLog(prev => [...prev.slice(-9), msg]);
  };

  const isAdeUrl = (url: string): boolean => {
    return url.includes(ADE_DOMAIN)
      && !CAS_DOMAINS.some(d => url.includes(d))
      && !url.includes('cas/login')
      && !url.includes('idp/profile');
  };

  const isCasUrl = (url: string): boolean => {
    return CAS_DOMAINS.some(d => url.includes(d))
      || url.includes('cas/login')
      || url.includes('idp/profile');
  };

  const handleNavChange = useCallback((nav: WebViewNavigation) => {
    currentUrlRef.current = nav.url || '';
    log('NAV: ' + (nav.url || '').substring(0, 80));
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    const url = currentUrlRef.current;

    if (isCasUrl(url)) {
      log('Page CAS detectee → injection JS');
      webViewRef.current?.injectJavaScript(INTERCEPT_CREDENTIALS_JS);
    } else if (isAdeUrl(url) && !sentRef.current) {
      log('Page ADE detectee → envoi credentials au backend');
      if (credentialsRef.current) {
        sendCredentialsToBackend(
          credentialsRef.current.username,
          credentialsRef.current.password,
        );
      } else {
        log('ERREUR: Pas de credentials interceptes (deja connecte ?)');
        Alert.alert(
          'Erreur',
          'Credentials non interceptes. Le WebView est en mode incognito, tu aurais du voir la page CAS.',
        );
      }
    }
  }, []);

  const sendCredentialsToBackend = useCallback(async (username: string, password: string) => {
    if (sentRef.current || sending) return;
    sentRef.current = true;
    setSending(true);
    log('Envoi credentials au backend...');
    try {
      await adeService.login(username, password);
      log('Backend OK !');
      onSuccess();
    } catch (e: any) {
      sentRef.current = false;
      const status = e?.response?.status || 'N/A';
      const detail = e?.response?.data?.detail || e?.message || 'Erreur inconnue';
      log(`ERREUR backend: ${status} - ${detail}`);
      Alert.alert('Erreur ADE', `[${status}] ${detail}`);
    } finally {
      setSending(false);
    }
  }, [sending, onSuccess]);

  const handleMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      if (msg.type === 'debug') {
        log('JS: ' + msg.msg);
      }

      if (msg.type === 'credentials') {
        log('Credentials interceptes: ' + msg.username);
        credentialsRef.current = { username: msg.username, password: msg.password };
      }
    } catch {
      // JSON parse error
    }
  }, []);

  const handleClose = useCallback(() => {
    sentRef.current = false;
    credentialsRef.current = null;
    setDebugLog([]);
    onCancel();
  }, [onCancel]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connexion ADE Consult</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>Fermer</Text>
          </TouchableOpacity>
        </View>

        {sending && (
          <View style={styles.sendingOverlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.sendingTxt}>Synchronisation avec le serveur...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: ADE_PLANNING_URL }}
          onNavigationStateChange={handleNavChange}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={handleLoadEnd}
          incognito
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          startInLoadingState
          style={styles.webview}
          userAgent={Platform.select({
            android: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            default: undefined,
          })}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#007AFF" size="large" />
          </View>
        )}

        {/* Debug log visible en bas */}
        {debugLog.length > 0 && (
          <View style={styles.debugPanel}>
            {debugLog.map((line, i) => (
              <Text key={i} style={styles.debugLine} numberOfLines={1}>{line}</Text>
            ))}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1C1C1E',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  closeTxt: { color: '#FF453A', fontSize: 16, fontWeight: '500' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'center',
    alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sendingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sendingTxt: { color: '#fff', marginTop: 12, fontSize: 16 },
  debugPanel: {
    backgroundColor: '#111', padding: 8, maxHeight: 150,
    borderTopWidth: 1, borderTopColor: '#333',
  },
  debugLine: { color: '#0f0', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
