// =====================================================================
//  lib/types-epreuve.ts · les types de l'épreuve individuelle
// =====================================================================
//  Fichier DONNÉ, à copier tel quel dans le dossier lib/ de ton projet.
//  Ne le modifie pas : la correction s'appuie sur ces noms, exactement
//  ceux-là, quel que soit le reste de ton architecture.
// =====================================================================
import type { EtatHumeur } from './humeur';

/**
 * Une heure de mesures : la moyenne horaire que ton écran d'historique
 * de la séance 4 demande à la base. Une grandeur inconnue vaut null,
 * jamais zéro.
 */
export type PointHoraire = {
  /** Début de l'heure, en millisecondes depuis 1970. */
  debut: number;
  /** Humidité du sol, en pourcentage. */
  humidite: number | null;
  /** Température de l'air, en degrés Celsius. */
  temperature: number | null;
  /** Lumière, en pourcentage. */
  lumiere: number | null;
};

/** Ce dont ta plante a besoin. À ajouter à ta fiche, sources à l'appui. */
export type BesoinsPlante = {
  /** Les seuils d'humidité du sol, les mêmes que FICHE.seuils. */
  humidite: { bas: number; haut: number };
  /** La plage de température qu'elle supporte, en degrés Celsius. */
  temperature: { min: number; max: number };
  /** La lumière minimale qu'elle demande en journée, en pourcentage. */
  lumiere: { min: number };
};

/** Les soucis possibles, du plus urgent au moins urgent. */
export type Probleme = 'assoiffee' | 'noyee' | 'froid' | 'chaud' | 'soif' | 'reput' | 'sombre';

/** L'ordre d'urgence, fixé par le sujet. */
export const ORDRE_URGENCE: readonly Probleme[] = [
  'assoiffee',
  'noyee',
  'froid',
  'chaud',
  'soif',
  'reput',
  'sombre',
];

export type Grandeur = 'humidite' | 'temperature' | 'lumiere';

export type Diagnostic = {
  /** ok : rien à signaler. soucis : au moins un problème. inconnu : on ne sait pas. */
  etat: 'ok' | 'soucis' | 'inconnu';
  /** Les problèmes, du plus urgent au moins urgent. Vide si ok ou inconnu. */
  problemes: Probleme[];
  /** Les grandeurs qu'on n'a pas pu vérifier, parce qu'elles valent null. */
  nonVerifie: Grandeur[];
};

/** Une suite d'au moins trois heures sans humidité connue. */
export type Trou = {
  /** Début de la première heure vide. */
  debut: number;
  /** Début de la première heure mesurée après le trou. */
  fin: number;
  /** Nombre d'heures vides. */
  heures: number;
};

export type SerieNettoyee = {
  /** Une case par heure, sans doublon, dans l'ordre, trous compris. */
  points: PointHoraire[];
  trous: Trou[];
  /** Part des heures dont l'humidité est connue, entre 0 et 1. */
  couverture: number;
};

export type BilanJour = {
  /** Le jour, au format AAAA-MM-JJ, en heure locale du téléphone. */
  jour: string;
  /** Nombre d'heures dont l'humidité est connue. */
  heuresMesurees: number;
  /** Vrai à partir de 18 heures mesurées. */
  complet: boolean;
  humiditeMin: number | null;
  humiditeMax: number | null;
  /** Moyenne des heures mesurées, arrondie au dixième. */
  humiditeMoyenne: number | null;
  /** Heures mesurées où l'humidité sort des seuils. */
  heuresHorsConfort: number;
  /** Hausses d'au moins 10 points entre deux heures consécutives mesurées. */
  arrosages: number;
};

// ---------------------------------------------------------------- options

export type Prevision =
  | { type: 'deja' }
  | { type: 'dans'; heures: number }
  | { type: 'pas_de_soif_prevue' }
  | { type: 'impossible' };

export type EntreeJournal = {
  humeur: EtatHumeur;
  /** Le moment où cette humeur a commencé. */
  depuis: number;
};
