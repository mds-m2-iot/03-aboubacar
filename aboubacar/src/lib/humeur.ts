// =====================================================================
//  lib/humeur.ts · le miroir TypeScript de firmware/src/humeur.h
// =====================================================================
//  Corrigé de l'atelier 2.4, « Calibrer et donner une humeur ».
//
//  La carte et le téléphone calculent la même humeur, chacun de leur
//  côté, à partir de la même humidité et des mêmes seuils. C'est la
//  définition même d'un contrat : si les deux logiques divergent, l'écran
//  de la carte et celui du téléphone disent deux choses différentes de la
//  même plante au même instant, et plus personne ne sait qui a raison.
//
//  Toute modification ici se fait en même temps que dans humeur.h. Le
//  test de la séance 6 compare les deux sur toute la plage.
//
//  Référence : docs/CONTRAT.md, section 3.
// =====================================================================
import {
  DUREE_FRAICHEUR_MS,
  MARGE_EXTREME,
  type Mesure,
  type Seuils,
} from './contrat';

/** Les cinq humeurs que la carte sait produire, avec les noms du contrat. */
export type Humeur = 'noyee' | 'reput' | 'heureuse' | 'soif' | 'assoiffee';

/**
 * Les deux états qui n'existent que côté application. La carte a toujours
 * une mesure sous la main, le téléphone peut n'avoir rien reçu, ou avoir
 * reçu il y a une heure. Dire « je ne sais pas » au lieu de « tout va
 * bien », c'est la différence entre un écran honnête et un objet décoratif.
 */
export type EtatHumeur = Humeur | 'inconnue' | 'perimee';

/**
 * L'humeur, à partir de l'humidité du sol.
 *
 * Même ordre que humeur.h, et il n'a rien de décoratif : « assoiffée » est
 * un cas particulier de « soif », donc l'extrême se teste en premier, sinon
 * il n'est jamais atteint. Même chose en haut avec « noyée » et « repue ».
 * Les comparaisons sont strictes : une humidité pile sur un seuil est
 * confortable.
 */
export function calculerHumeur(humidite: number, seuilBas: number, seuilHaut: number): Humeur {
  if (humidite > seuilHaut + MARGE_EXTREME) return 'noyee';
  if (humidite > seuilHaut) return 'reput';
  if (humidite < seuilBas - MARGE_EXTREME) return 'assoiffee';
  if (humidite < seuilBas) return 'soif';
  return 'heureuse';
}

/** Les libellés de la fiche d'identité, ceux que les binômes ont écrits sur papier. */
const LIBELLES: Record<EtatHumeur, string> = {
  noyee: 'Noyée',
  reput: 'Repue',
  heureuse: 'Heureuse',
  soif: 'Assoiffée',
  assoiffee: 'Desséchée',
  inconnue: 'Sans nouvelles',
  perimee: 'Donnée périmée',
};

export function libelleHumeur(etat: EtatHumeur): string {
  return LIBELLES[etat];
}

/** Les messages par défaut du contrat. La fiche de la plante les remplace. */
export const MESSAGES_DEFAUT: Record<Humeur, string> = {
  noyee: 'Je nage, arrête un peu',
  reput: "J'ai un peu trop bu",
  heureuse: 'Tout va bien, merci',
  soif: "J'ai soif",
  assoiffee: "Au secours, de l'eau",
};

/** La phrase que la plante dit à la première personne. */
export function messageHumeur(etat: EtatHumeur, messages: Record<Humeur, string> = MESSAGES_DEFAUT): string {
  if (etat === 'inconnue') return 'Je ne me suis pas encore présentée';
  if (etat === 'perimee') return 'Je me suis tue, va voir ma carte';
  return messages[etat];
}

/**
 * Une couleur par humeur. Le vert feuille du thème reste réservé à
 * l'état confortable : sur un écran vu de loin, la couleur porte
 * l'information avant le texte. Trop d'eau en prune, trop sec en ambre
 * puis terre cuite : pas de bleu, pas de turquoise.
 */
const COULEURS_HUMEUR: Record<EtatHumeur, string> = {
  noyee: '#7A4E8C',
  reput: '#B08BBF',
  heureuse: '#3F7D3A',
  soif: '#D9A441',
  assoiffee: '#C4553B',
  inconnue: '#8C857A',
  perimee: '#8C857A',
};

export function couleurHumeur(etat: EtatHumeur): string {
  return COULEURS_HUMEUR[etat];
}

/**
 * L'humeur affichée, fraîcheur comprise. Trois cas, dans cet ordre :
 * aucune mesure, mesure trop vieille, humidité absente. L'humeur se
 * calcule sur l'humidité du sol et sur rien d'autre.
 */
export function etatAffiche(
  derniere: Mesure | null,
  seuils: Seuils,
  maintenant: number,
  dureeFraicheurMs: number = DUREE_FRAICHEUR_MS,
): EtatHumeur {
  if (!derniere) return 'inconnue';
  if (maintenant - derniere.horodatage > dureeFraicheurMs) return 'perimee';
  if (derniere.humidite === null) return 'inconnue';
  return calculerHumeur(derniere.humidite, seuils.bas, seuils.haut);
}

/**
 * Tolérance de recollage, en millisecondes. Un peu plus que l'intervalle
 * entre deux notifications d'un même cycle, bien moins qu'un cycle de
 * deux secondes : on répare un découpage, on ne comble pas un trou.
 */
export const TOLERANCE_RECOLLAGE_MS = 3000;

/**
 * La dernière mesure, complétée par les grandeurs du même cycle.
 *
 * Le Bluetooth notifie les trois grandeurs séparément, à quelques
 * dizaines de millisecondes d'intervalle. La toute dernière mesure peut
 * n'en porter qu'une, et sans recollage l'humeur retomberait sur « sans
 * nouvelles » et les chiffres clignoteraient en tirets à chaque cycle.
 *
 * On remonte donc chercher les grandeurs manquantes dans les mesures
 * juste avant, et SEULEMENT dans celles du même cycle : au-delà de la
 * tolérance, une valeur absente reste absente. Un capteur débranché doit
 * se voir, pas se faire remplacer par son souvenir.
 */
export function mesureConsolidee(
  mesures: Mesure[],
  toleranceMs: number = TOLERANCE_RECOLLAGE_MS,
): Mesure | null {
  if (mesures.length === 0) return null;

  const derniere = mesures[mesures.length - 1];
  let { humidite, temperature, lumiere } = derniere;

  for (let i = mesures.length - 2; i >= 0; i -= 1) {
    if (humidite !== null && temperature !== null && lumiere !== null) break;
    const precedente = mesures[i];
    if (derniere.horodatage - precedente.horodatage > toleranceMs) break;
    if (humidite === null) humidite = precedente.humidite;
    if (temperature === null) temperature = precedente.temperature;
    if (lumiere === null) lumiere = precedente.lumiere;
  }

  return { ...derniere, humidite, temperature, lumiere };
}
