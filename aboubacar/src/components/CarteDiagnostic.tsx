// Carte « Son diagnostic » de l'accueil (imposée 1).
import { StyleSheet, Text } from "react-native";

import type { Mesure } from "../lib/contrat";
import { diagnostiquer } from "../lib/diagnostic";
import { FICHE } from "../lib/fiche";
import { COULEURS, ESPACES } from "../lib/theme";
import type { Grandeur, Probleme } from "../lib/types-epreuve";
import { Verre } from "./Verre";

// Ce que la carte reçoit de l'accueil : la dernière mesure et l'heure actuelle.
type Props = { mesure: Mesure | null; maintenant: number };

// Le nom affiché de chaque problème.
const NOMS_PROBLEMES: Record<Probleme, string> = {
  assoiffee: "Assoiffée",
  noyee: "Noyée",
  froid: "Trop froid",
  chaud: "Trop chaud",
  soif: "Un peu soif",
  reput: "Assez bu",
  sombre: "Trop sombre",
};

// Le nom affiché de chaque grandeur, pour « Non vérifié : ... ».
const NOMS_GRANDEURS: Record<Grandeur, string> = {
  humidite: "humidité",
  temperature: "température",
  lumiere: "lumière",
};

// CarteDiagnostic : appelle diagnostiquer, puis affiche le problème le plus
// urgent avec la phrase de la plante, le nombre d'autres soucis et ce qui
// n'a pas été vérifié.
export function CarteDiagnostic({ mesure, maintenant }: Props) {
  const diagnostic = diagnostiquer(mesure, FICHE.besoins, maintenant);
  const urgent = diagnostic.problemes[0]; // déjà trié : le premier est le plus urgent
  const autres = diagnostic.problemes.length - 1;

  // Le titre et la phrase selon l'état.
  let titre: string;
  let phrase: string;
  if (diagnostic.etat === "inconnu") {
    titre = "On ne sait pas";
    phrase = FICHE.phrases.inconnu;
  } else if (diagnostic.etat === "ok") {
    titre = "Tout va bien";
    phrase = FICHE.phrases.ok;
  } else {
    titre = NOMS_PROBLEMES[urgent];
    phrase = FICHE.phrases[urgent];
  }

  return (
    <Verre style={styles.carte}>
      <Text style={styles.petitTitre}>SON DIAGNOSTIC</Text>
      <Text style={styles.titre}>{titre}</Text>
      <Text style={styles.phrase}>« {phrase} »</Text>
      {autres > 0 ? (
        <Text style={styles.legende}>Et {autres} autre(s) souci(s).</Text>
      ) : null}
      {diagnostic.nonVerifie.length > 0 ? (
        <Text style={styles.legende}>
          Non vérifié :{" "}
          {diagnostic.nonVerifie.map((g) => NOMS_GRANDEURS[g]).join(", ")}.
        </Text>
      ) : null}
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
  titre: {
    marginTop: ESPACES.petit,
    fontSize: 26,
    fontWeight: "800",
    color: COULEURS.texte,
  },
  phrase: {
    marginTop: ESPACES.petit,
    fontSize: 18,
    fontStyle: "italic",
    color: COULEURS.texte,
  },
  legende: {
    marginTop: ESPACES.petit,
    fontSize: 14,
    lineHeight: 20,
    color: COULEURS.gris,
  },
});
