import { StyleSheet, View } from 'react-native';

import { COULEURS } from '../lib/theme';

/**
 * Le fond commun à tous les écrans : du crème, et trois grandes taches
 * de couleur douces que le verre des cartes laisse transparaître.
 * pointerEvents="none" : le fond ne doit jamais voler un toucher.
 */
export function Fond() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.tache, styles.sauge]} />
      <View style={[styles.tache, styles.peche]} />
      <View style={[styles.tache, styles.rose]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tache: { position: 'absolute', borderRadius: 999, opacity: 0.75 },
  sauge: { width: 360, height: 360, top: -120, left: -110, backgroundColor: COULEURS.tacheSauge },
  peche: { width: 300, height: 300, top: 240, right: -140, backgroundColor: COULEURS.tachePeche },
  rose: { width: 320, height: 320, bottom: -120, left: -60, backgroundColor: COULEURS.tacheRose },
});
