// Carte « Ce qui manque » de l'historique (imposée 2).
import { StyleSheet, Text } from "react-native";

import { COULEURS, ESPACES } from "../lib/theme";
import type { SerieNettoyee, Trou } from "../lib/types-epreuve";
import { Verre } from "./Verre";

// Ce que la carte reçoit de l'écran : la série nettoyée par nettoyerSerie.
type Props = { serie: SerieNettoyee };

// Un trou en clair : « Carte silencieuse 7 h, mercredi de 1 h à 8 h ».
function phraseTrou(trou: Trou): string {
  const debut = new Date(trou.debut);
  const fin = new Date(trou.fin);
  const jour = debut.toLocaleDateString("fr-FR", { weekday: "long" });
  return `Carte silencieuse ${trou.heures} h, ${jour} de ${debut.getHours()} h à ${fin.getHours()} h`;
}

// CarteTrous : affiche la couverture en % et une phrase par trou
// (ou « Aucun trou » si la carte a tout envoyé).
export function CarteTrous({ serie }: Props) {
  const couverture = Math.round(serie.couverture * 100); // 0,93 → 93

  return (
    <Verre style={styles.carte}>
      <Text style={styles.petitTitre}>CE QUI MANQUE</Text>
      <Text style={styles.couverture}>
        Couverture : {couverture} % des heures mesurées
      </Text>
      {serie.trous.length === 0 ? (
        <Text style={styles.ligne}>Aucun trou : la carte a tout envoyé.</Text>
      ) : (
        serie.trous.map((trou) => (
          <Text key={trou.debut} style={styles.ligne}>
            {phraseTrou(trou)}
          </Text>
        ))
      )}
    </Verre>
  );
}

const styles = StyleSheet.create({
  carte: { marginTop: ESPACES.grand, padding: ESPACES.grand },
  petitTitre: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: COULEURS.gris,
  },
  couverture: {
    marginTop: ESPACES.petit,
    fontSize: 16,
    fontWeight: "700",
    color: COULEURS.texte,
  },
  ligne: {
    marginTop: ESPACES.petit,
    fontSize: 14,
    lineHeight: 20,
    color: COULEURS.texte,
  },
});
