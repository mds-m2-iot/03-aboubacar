// Bouton « Partager la semaine » de l'historique (option B).
import { Alert, Pressable, Share, StyleSheet, Text } from "react-native";

import { versCsv } from "../lib/export";
import { COULEURS, ESPACES, RAYONS } from "../lib/theme";
import type { BilanJour } from "../lib/types-epreuve";

// Ce que le bouton reçoit de l'écran : le bilan de la semaine.
type Props = { bilan: readonly BilanJour[] };

// BoutonPartager : au toucher, transforme le bilan en CSV avec versCsv
// et ouvre le partage du téléphone (Mail, Notes, Fichiers…).
export function BoutonPartager({ bilan }: Props) {
  // Ouvre le partage du téléphone avec le CSV dedans.
  async function partager() {
    try {
      await Share.share({
        message: versCsv(bilan),
        title: "La semaine de ma plante",
      });
    } catch {
      Alert.alert("Partage impossible", "Réessaie dans un instant.");
    }
  }

  return (
    <Pressable
      onPress={partager}
      accessibilityRole="button"
      accessibilityLabel="Partager la semaine au format CSV"
      style={({ pressed }) => [styles.bouton, pressed && styles.appuye]}
    >
      <Text style={styles.texte}>Partager la semaine</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    alignSelf: "flex-start",
    marginTop: ESPACES.moyen,
    paddingVertical: ESPACES.petit + 2,
    paddingHorizontal: ESPACES.grand,
    borderRadius: RAYONS.bouton,
    backgroundColor: COULEURS.accent,
  },
  appuye: { opacity: 0.8 },
  texte: { fontSize: 15, fontWeight: "600", color: COULEURS.carte },
});
