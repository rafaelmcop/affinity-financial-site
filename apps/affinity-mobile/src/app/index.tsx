import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { roles, type Role } from '../lib/portal';

export default function Welcome() {
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.brand}>AFFINITY</Text>
      <Text style={styles.title}>Seu próximo atendimento começa aqui.</Text>
      <Text style={styles.subtitle}>Escolha seu portal e entre com a conta que você já usa.</Text>
      {(Object.keys(roles) as Role[]).map(role => <Pressable accessibilityRole="button" key={role} style={styles.card} onPress={() => router.push({ pathname: '/portal', params: { role } })}>
        <View style={styles.row}><Text style={styles.cardTitle}>{roles[role].title}</Text><Text style={styles.arrow}>→</Text></View>
        <Text style={styles.description}>{roles[role].description}</Text>
      </Pressable>)}
      <Text style={styles.note}>Seu acesso é definido pela sua conta. Selecionar um portal não altera suas permissões.</Text>
      <Text style={styles.version}>Versão de teste · 0.1</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12344b' },
  content: { padding: 24, paddingTop: 40, gap: 18, flexGrow: 1 },
  brand: { color: '#8cd8b6', letterSpacing: 4, fontWeight: '800', fontSize: 16 },
  title: { color: '#fff', fontSize: 34, lineHeight: 42, fontWeight: '700', marginTop: 14 },
  subtitle: { color: '#c9d8e1', fontSize: 17, lineHeight: 25, marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 22, borderRadius: 18, minHeight: 110 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#12344b', fontSize: 22, fontWeight: '700' },
  arrow: { color: '#126448', fontSize: 26 },
  description: { color: '#546b7b', marginTop: 9, fontSize: 15, lineHeight: 22 },
  note: { color: '#c9d8e1', fontSize: 13, lineHeight: 20 },
  version: { color: '#8ea6b5', fontSize: 12, marginTop: 12 },
});
