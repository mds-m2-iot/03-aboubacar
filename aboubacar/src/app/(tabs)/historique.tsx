import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFIG } from '../../lib/config';
import { COULEURS, ESPACES } from '../../lib/theme';
import { BlocHistorique } from '../../components/BlocHistorique';
import { Fond } from '../../components/Fond';

// Allégé en séance 6 : la courbe vit dans components/BlocHistorique.tsx,
// pour servir aussi aux plantes suivies. Ici, seulement TON identifiant.
export default function Historique() {
  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>Historique</Text>
        <View style={styles.filet} />
        <BlocHistorique pairId={CONFIG.idBinome} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: ESPACES.grand, paddingBottom: ESPACES.grand * 2 },
  titre: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, color: COULEURS.texte },
  filet: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: COULEURS.accent,
    marginTop: ESPACES.petit,
  },
});
