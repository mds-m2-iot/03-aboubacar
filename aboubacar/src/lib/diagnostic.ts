// lib/diagnostic.ts · imposée 1 : regarde humidité, température et lumière,
// et range les problèmes du plus urgent au moins urgent.

import { DUREE_FRAICHEUR_MS, type Mesure } from './contrat';
import { calculerHumeur } from './humeur';
import {
  ORDRE_URGENCE,
  type BesoinsPlante,
  type Diagnostic,
  type Grandeur,
  type Probleme,
} from './types-epreuve';

const GRANDEURS: readonly Grandeur[] = ['humidite', 'temperature', 'lumiere'];
const HEURE_LEVER = 9; // incluse
const HEURE_COUCHER = 18; // exclue

export function diagnostiquer(
  mesure: Mesure | null,
  besoins: BesoinsPlante,
  maintenant: number,
): Diagnostic {
  // Règle 1 : pas de mesure, ou plus de 5 min (5 min pile = encore fraîche).
  if (mesure === null || maintenant - mesure.horodatage > DUREE_FRAICHEUR_MS) {
    return { etat: 'inconnu', problemes: [], nonVerifie: [...GRANDEURS] };
  }

  // Règle 2 : grandeurs manquantes ; si les 3 manquent, on ne sait rien.
  const nonVerifie = GRANDEURS.filter((grandeur) => mesure[grandeur] === null);
  if (nonVerifie.length === GRANDEURS.length) {
    return { etat: 'inconnu', problemes: [], nonVerifie };
  }

  const problemes: Probleme[] = [];

  // Règle 3 : humidité, même règle que l'humeur.
  if (mesure.humidite !== null) {
    const humeur = calculerHumeur(mesure.humidite, besoins.humidite.bas, besoins.humidite.haut);
    if (humeur !== 'heureuse') problemes.push(humeur);
  }

  // Règle 4 : température (pile sur une borne = pas de problème).
  if (mesure.temperature !== null) {
    if (mesure.temperature < besoins.temperature.min) problemes.push('froid');
    else if (mesure.temperature > besoins.temperature.max) problemes.push('chaud');
  }

  // Règle 5 : lumière, seulement de jour (heure de la mesure, pas de maintenant).
  const heure = new Date(mesure.horodatage).getHours();
  const deJour = heure >= HEURE_LEVER && heure < HEURE_COUCHER;
  if (deJour && mesure.lumiere !== null && mesure.lumiere < besoins.lumiere.min) {
    problemes.push('sombre');
  }

  // Règle 6 : tri par urgence, puis état final.
  problemes.sort((a, b) => ORDRE_URGENCE.indexOf(a) - ORDRE_URGENCE.indexOf(b));
  return { etat: problemes.length > 0 ? 'soucis' : 'ok', problemes, nonVerifie };
}
