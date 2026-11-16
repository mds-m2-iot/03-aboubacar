// =====================================================================
//  lib/exemple.ts · la semaine d'exemple, DONNÉ
// =====================================================================
//  Une semaine de moyennes horaires, du lundi 28 septembre au dimanche
//  4 octobre 2026, avec les défauts d'une vraie collecte : une nuit sans
//  carte, une sonde débranchée, des valeurs impossibles, un doublon, deux
//  heures dans le désordre, et un point daté de 2027.
//
//  Si ton historique de la séance 4 ne marche pas, branche tes écrans
//  sur ces données : l'épreuve ne dépend pas de la séance 4.
// =====================================================================
import semaine from '../donnees/semaine-exemple.json';
import type { PointHoraire } from './types-epreuve';

/** Brut, défauts compris : à passer dans nettoyerSerie avant tout calcul. */
export const SEMAINE_EXEMPLE = semaine as unknown as PointHoraire[];

/** Le lundi qui suit la semaine, 10 h : un « maintenant » cohérent avec elle. */
export const MAINTENANT_EXEMPLE = Date.parse('2026-10-05T10:00:00+02:00');
