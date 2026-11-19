// Section « Sa semaine » de l'historique (imposée 3).
import { StyleSheet, Text, View } from "react-native";

import { formaterValeur } from "../lib/affichage";
import { COULEURS, ESPACES } from "../lib/theme";
import type { BilanJour } from "../lib/types-epreuve";
import { Verre } from "./Verre";

// Ce que la section reçoit de l'écran : le bilan de la semaine.
type Props = { bilan: readonly BilanJour[] };

// "2026-09-28" → "lundi 28 septembre"
function nomDuJour(jour: string): string {
  return new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Le détail d'un jour, sur deux lignes.
function resume(jour: BilanJour): string {
  if (jour.heuresMesurees === 0) return "Aucune mesure ce jour-là";
  const min = formaterValeur(jour.humiditeMin);
  const max = formaterValeur(jour.humiditeMax);
  const moyenne = formaterValeur(jour.humiditeMoyenne);
  return `De ${min} à ${max} %, moyenne ${moyenne} %\n${jour.heuresHorsConfort} h hors confort · ${jour.arrosages} arrosage(s)`;
}

// SaSemaine : une ligne par jour du bilan (nom du jour, détail), avec
// « Incomplet » si le jour a moins de 18 h mesurées.
export function SaSemaine({ bilan }: Props) {
  // Aucun jour : on le dit, pas d'écran vide.
  if (bilan.length === 0) {
    return (
      <Text style={styles.vide}>Pas encore de mesures cette semaine.</Text>
    );
  }

  return (
    <Verre style={styles.carte}>
      {bilan.map((jour) => (
        <View key={jour.jour} style={styles.ligne}>
          <Text style={styles.jour}>{nomDuJour(jour.jour)}</Text>
          {jour.complet ? null : (
            <Text style={styles.incomplet}>
              Incomplet : {jour.heuresMesurees} h mesurées sur 24
            </Text>
          )}
          <Text style={styles.detail}>{resume(jour)}</Text>
        </View>
      ))}
    </Verre>
  );
}

const styles = StyleSheet.create({
  carte: { marginTop: ESPACES.moyen, padding: ESPACES.grand },
  ligne: {
    paddingVertical: ESPACES.petit,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.filet,
  },
  jour: { fontSize: 16, fontWeight: "700", color: COULEURS.texte },
  incomplet: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
    color: COULEURS.gris,
  },
  detail: { marginTop: 2, fontSize: 14, lineHeight: 20, color: COULEURS.texte },
  vide: { marginTop: ESPACES.moyen, fontSize: 15, color: COULEURS.gris },
});
