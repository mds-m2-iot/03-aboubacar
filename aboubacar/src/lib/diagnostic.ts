// =====================================================================
//  lib/diagnostic.ts · imposée 1, le diagnostic
// =====================================================================
//  L'humeur ne regarde que l'humidité. Le diagnostic regarde tout
//  (humidité, température, lumière) et range les problèmes du plus
//  urgent au moins urgent.
// =====================================================================

// On importe la durée max d'une mesure (5 min) et le type d'une mesure.
import { DUREE_FRAICHEUR_MS, type Mesure } from './contrat';
// On importe la fonction de l'humeur (séance 2) pour la réutiliser.
import { calculerHumeur } from './humeur';
// On importe les types de l'épreuve et l'ordre d'urgence des problèmes.
import {
  ORDRE_URGENCE, // la liste des problèmes, du plus urgent au moins urgent
  type BesoinsPlante, // ce dont la plante a besoin (humidité, température, lumière)
  type Diagnostic, // ce que la fonction rend : etat, problemes, nonVerifie
  type Grandeur, // 'humidite' | 'temperature' | 'lumiere'
  type Probleme, // 'assoiffee' | 'noyee' | 'froid' | ... | 'sombre'
} from './types-epreuve';

// Les 3 grandeurs, dans l'ordre imposé par le sujet.
const GRANDEURS: readonly Grandeur[] = ['humidite', 'temperature', 'lumiere'];
// Heure où commence le jour (9 h incluse).
const HEURE_LEVER = 9;
// Heure où finit le jour (18 h exclue).
const HEURE_COUCHER = 18;

// diagnostiquer : à partir de la dernière mesure, dit comment va la plante.
// Rend l'état (inconnu, ok ou soucis), les problèmes du plus urgent au moins
// urgent, et les grandeurs qu'on n'a pas pu vérifier.
export function diagnostiquer(
  mesure: Mesure | null, // la dernière mesure, ou null s'il n'y en a pas
  besoins: BesoinsPlante, // les besoins de la plante
  maintenant: number, // l'heure actuelle, en millisecondes
): Diagnostic {
  // ---------- Règle 1 : mesure absente ou trop vieille ----------

  // Pas de mesure OU mesure de plus de 5 min (5 min pile = encore fraîche, d'où « > »).
  if (mesure === null || maintenant - mesure.horodatage > DUREE_FRAICHEUR_MS) {
    // On ne sait rien : état inconnu, aucun problème, les 3 grandeurs non vérifiées.
    // [...GRANDEURS] fait une copie du tableau pour ne pas exposer la constante.
    return { etat: 'inconnu', problemes: [], nonVerifie: [...GRANDEURS] };
  }

  // ---------- Règle 2 : grandeurs manquantes ----------

  // On garde les grandeurs dont la valeur vaut null (mesure['humidite'], etc.).
  const nonVerifie = GRANDEURS.filter((grandeur) => mesure[grandeur] === null);
  // Si les 3 manquent, on ne peut rien dire.
  if (nonVerifie.length === GRANDEURS.length) {
    // État inconnu, aucun problème, les 3 dans nonVerifie.
    return { etat: 'inconnu', problemes: [], nonVerifie };
  }

  // Tableau vide qu'on remplit au fur et à mesure des problèmes trouvés.
  const problemes: Probleme[] = [];

  // ---------- Règle 3 : humidité ----------

  // On ne vérifie l'humidité que si elle est connue.
  if (mesure.humidite !== null) {
    // Même règle que l'humeur : on réutilise calculerHumeur (une seule humeur rendue).
    const humeur = calculerHumeur(mesure.humidite, besoins.humidite.bas, besoins.humidite.haut);
    // « heureuse » = pas de problème ; sinon on ajoute l'humeur (soif, noyee...).
    if (humeur !== 'heureuse') problemes.push(humeur);
  }

  // ---------- Règle 4 : température ----------

  // On ne vérifie la température que si elle est connue.
  if (mesure.temperature !== null) {
    // Strictement sous le minimum : froid.
    if (mesure.temperature < besoins.temperature.min) problemes.push('froid');
    // Sinon, strictement au-dessus du maximum : chaud (pile sur une borne = rien).
    else if (mesure.temperature > besoins.temperature.max) problemes.push('chaud');
  }

  // ---------- Règle 5 : lumière, seulement de jour ----------

  // L'heure locale (0 à 23) au moment de la mesure, pas de maintenant.
  const heure = new Date(mesure.horodatage).getHours();
  // Vrai si l'heure est entre 9 h (incluse) et 18 h (exclue).
  const deJour = heure >= HEURE_LEVER && heure < HEURE_COUCHER;
  // De jour, lumière connue et sous le minimum : trop sombre.
  if (deJour && mesure.lumiere !== null && mesure.lumiere < besoins.lumiere.min) {
    // On ajoute le problème « sombre ».
    problemes.push('sombre');
  }

  // ---------- Règle 6 : tri et état final ----------

  // On trie selon la place dans ORDRE_URGENCE (0 = le plus urgent en premier).
  problemes.sort((a, b) => ORDRE_URGENCE.indexOf(a) - ORDRE_URGENCE.indexOf(b));

  // Au moins un problème : « soucis », sinon « ok ». On rend le diagnostic complet.
  return { etat: problemes.length > 0 ? 'soucis' : 'ok', problemes, nonVerifie };
}
