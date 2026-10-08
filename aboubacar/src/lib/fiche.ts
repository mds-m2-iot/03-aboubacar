// =====================================================================
//  lib/fiche.ts · la fiche d'identité de la plante du binôme
// =====================================================================
//  Ce que la fiche papier de la séance 1 dit, le code le redit ici. Les
//  deux seuils sont LA décision de la séance 1 : ils pilotent l'humeur
//  affichée depuis la séance 2, et la carte les recevra en séance 3.
//
//  Le type Seuils vient du contrat, pas d'ici. C'est la règle du
//  module : ce qui est partagé avec la carte se lit dans contrat.ts et
//  ne se réécrit jamais à côté.
// =====================================================================
import type { Seuils } from './contrat';
import type { Humeur } from './humeur';

export type FichePlante = {
  /** Identifiant court, celui qui voyage dans l'URL de la route. */
  id: string;
  /** Le petit nom, libre. */
  nom: string;
  espece: string;
  nomLatin: string;
  /**
   * Le nom que la carte annonce en Bluetooth : NOM_PLANTE, dans
   * firmware/src/config.h. Le pilote s'en sert pour ne pas se brancher
   * sur la carte du voisin. Les deux doivent être écrits pareil, à la
   * majuscule près.
   */
  nomAnnonce: string;
  /** Les deux seuils d'humidité du sol, en pourcentage. */
  seuils: Seuils;
  /** Une phrase par seuil, celle qui justifie le chiffre. */
  pourquoiBas: string;
  pourquoiHaut: string;
  /**
   * Ce que la plante dit dans chacune de ses cinq humeurs. Ce sont les
   * phrases de messageHumeur() dans firmware/src/humeur.h, accents en
   * plus : l'écran de la carte et le téléphone disent la même chose.
   */
  messages: Record<Humeur, string>;
  exposition: string;
  arrosage: string;
  /** D'où viennent les chiffres. La question tombe en soutenance. */
  source: string;
};

export const FICHE: FichePlante = {
  id: 'passiflore',
  nom: 'ABOU',
  espece: 'Passiflore bleue',
  nomLatin: 'Passiflora caerulea',
  nomAnnonce: 'Aboubacar',
  seuils: { bas: 35, haut: 70 },
  pourquoiBas: 'En croissance elle veut un sol qui reste frais, sans jamais sécher à cœur.',
  pourquoiHaut:
    "Elle craint l'eau stagnante bien plus que la sécheresse, donc jamais de soucoupe pleine.",
  messages: {
    noyee: 'Je suis toute mouillee',
    reput: 'Je suis pleine',
    heureuse: 'Tout va bien, merci',
    soif: "J'ai soif",
    assoiffee: "Au secours, de l'eau",
  },
  exposition: 'Soleil à mi-ombre',
  arrosage: "Abondant l'été, très réduit l'hiver",
  source: 'aujardin.info, fiche Passiflora caerulea, consultée le 22 septembre 2026',
};

/**
 * Retrouve une fiche par son identifiant.
 *
 * Rend null quand l'identifiant est inconnu, et c'est volontaire : une
 * route dynamique reçoit ce qu'on lui donne, y compris n'importe quoi.
 * L'écran doit savoir le dire au lieu de planter.
 */
export function ficheParId(id: string | undefined): FichePlante | null {
  return id === FICHE.id ? FICHE : null;
}
