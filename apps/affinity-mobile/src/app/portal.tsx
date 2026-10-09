import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { destination, ORIGIN, parseRole, roles } from '../lib/portal';

export default function Portal() {
  const params = useLocalSearchParams<{ role: string }>();
  const role = parseRole(params.role);
  const portal = roles[role || 'agent'];
  const ref = useRef<WebView>(null);
  const [uri, setUri] = useState(ORIGIN + portal.login);
  const [currentUrl, setCurrentUrl] = useState(uri);
  const [canBack, setCanBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canBack) ref.current?.goBack(); else router.back();
      return true;
    });
    return () => subscription.remove();
  }, [canBack]);
  if (!role) return <SafeAreaView style={styles.safe}><Pressable onPress={() => router.replace('/')}><Text style={styles.white}>Voltar para os portais</Text></Pressable></SafeAreaView>;
  function openExternal(url: string) {
    Linking.openURL(url).catch(() => Alert.alert('Não foi possível abrir', 'Confira se o aplicativo está instalado e tente novamente.'));
  }
  function navigate(raw: string) {
    const target = destination(raw);
    if (target.type === 'internal') return true;
    if (target.type === 'call') {
      Alert.alert('Ligar para o contato?', target.phone, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Ligar', onPress: () => openExternal('tel:' + target.phone) }]);
    } else if (target.type === 'whatsapp') {
      // A selected template is only a draft. Sending remains a manual action in WhatsApp.
      const text = target.message ? '&text=' + encodeURIComponent(target.message) : '';
      Linking.openURL('whatsapp://send?phone=' + target.phone.slice(1) + text).catch(() => openExternal('https://wa.me/' + target.phone.slice(1) + (text ? '?' + text.slice(1) : '')));
    } else if (target.type === 'external') {
      Alert.alert('Abrir link externo?', new URL(target.url).hostname, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir', onPress: () => openExternal(target.url) }]);
    }
    return false;
  }
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => canBack ? ref.current?.goBack() : router.back()} style={styles.back}><Text style={styles.white}>‹ Voltar</Text></Pressable>
      <Text style={styles.title}>Affinity · {portal.title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Atualizar tela" onPress={() => ref.current?.reload()} style={styles.back}><Text style={styles.white}>↻</Text></Pressable>
    </View>
    <View style={styles.body}>
      <WebView ref={ref} source={{ uri }} style={styles.web}
        originWhitelist={['*']} onShouldStartLoadWithRequest={request => navigate(request.url)}
        onOpenWindow={event => { if (navigate(event.nativeEvent.targetUrl)) setUri(event.nativeEvent.targetUrl); }}
        javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled={false}
        mixedContentMode="never" allowsBackForwardNavigationGestures
        onNavigationStateChange={state => { setCanBack(state.canGoBack); setCurrentUrl(state.url); }}
        onLoadStart={() => { setLoading(true); setFailed(false); }} onLoadEnd={() => setLoading(false)}
        onError={() => { setFailed(true); setLoading(false); }}
        onHttpError={event => { if (event.nativeEvent.statusCode >= 500) { setFailed(true); setLoading(false); } }}
      />
      {loading && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color="#126448" /><Text>Carregando…</Text></View>}
      {failed && <View style={styles.failure}><Text style={styles.errorTitle}>Não foi possível carregar o portal.</Text><Text>Verifique sua conexão. Seu atendimento continua no CRM.</Text><Pressable style={styles.retry} onPress={() => { setFailed(false); ref.current?.reload(); }}><Text style={styles.white}>Tentar novamente</Text></Pressable></View>}
    </View>
    <View style={styles.tabs}>{portal.tabs.map(tab => <Pressable accessibilityRole="button" accessibilityState={{ selected: currentUrl === ORIGIN + tab.path }} key={tab.path} style={[styles.tab, currentUrl === ORIGIN + tab.path && styles.selected]} onPress={() => { if (currentUrl === ORIGIN + tab.path) return; const next = ORIGIN + tab.path; if (uri === next) ref.current?.injectJavaScript("window.location.assign(" + JSON.stringify(next) + ");true;"); else setUri(next); }}><Text style={styles.tabText}>{tab.title}</Text></Pressable>)}</View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12344b' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 16 },
  back: { paddingVertical: 8 }, white: { color: '#fff', fontWeight: '600' },
  title: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { flex: 1, backgroundColor: '#f3f6f8' }, web: { flex: 1 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, padding: 10, gap: 8, flexDirection: 'row', justifyContent: 'center', backgroundColor: '#f3f6f8' },
  failure: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f3f6f8', padding: 28, justifyContent: 'center', gap: 16 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#12344b' },
  retry: { padding: 16, borderRadius: 10, backgroundColor: '#126448', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 5 },
  tab: { flex: 1, minHeight: 50, padding: 8, justifyContent: 'center', borderRadius: 10 },
  selected: { backgroundColor: '#e2f4e9' },
  tabText: { textAlign: 'center', color: '#12344b', fontWeight: '600', fontSize: 12 },
});
