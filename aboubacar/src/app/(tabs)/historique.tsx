import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CONFIG } from "../../lib/config";
import { COULEURS, ESPACES } from "../../lib/theme";
import { BlocHistorique } from "../../components/BlocHistorique";
import { Fond } from "../../components/Fond";
import { BoutonPartager } from "../../components/BoutonPartager";
import { bilanParJour } from "../../lib/bilan";
import { MAINTENANT_EXEMPLE, SEMAINE_EXEMPLE } from "../../lib/exemple";
import { FICHE } from "../../lib/fiche";
import { nettoyerSerie } from "../../lib/serie";
import { SaSemaine } from "../../components/SaSemaine";

// La semaine d'exemple, nettoyée puis résumée jour par jour (calculé une fois).
const BILAN = bilanParJour(
  nettoyerSerie(SEMAINE_EXEMPLE, MAINTENANT_EXEMPLE).points,
  FICHE.seuils,
);

// Allégé en séance 6 : la courbe vit dans components/BlocHistorique.tsx,
// pour servir aussi aux plantes suivies. Ici, seulement TON identifiant.
export default function Historique() {
  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>Historique</Text>
        <View style={styles.filet} />
        <BlocHistorique pairId={CONFIG.idBinome} />
        <Text style={styles.sousTitre}>Sa semaine</Text>
        <SaSemaine bilan={BILAN} />
        <BoutonPartager bilan={BILAN} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond },
  // Marge du bas : la barre d'onglets flotte par-dessus, il faut pouvoir défiler au-delà.
  contenu: { padding: ESPACES.grand, paddingBottom: 140 },
  titre: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COULEURS.texte,
  },
  sousTitre: {
    marginTop: ESPACES.grand,
    fontSize: 22,
    fontWeight: "700",
    color: COULEURS.texte,
  },
  filet: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: COULEURS.accent,
    marginTop: ESPACES.petit,
  },
});
