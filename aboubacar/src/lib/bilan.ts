// =====================================================================
//  lib/bilan.ts · imposée 3, la semaine de ta plante
// =====================================================================
//  Résume la série nettoyée jour par jour : heures mesurées, min, max,
//  moyenne, heures hors confort et arrosages.
// =====================================================================
import type { Seuils } from './contrat';
import type { BilanJour, PointHoraire } from './types-epreuve';

const HEURES_COMPLET = 18; // un jour est complet à partir de 18 h mesurées
const HAUSSE_ARROSAGE = 10; // +10 points d'une heure à l'autre = un arrosage

// Ce qu'on retient pour un jour pendant le parcours.
type Jour = { humidites: number[]; arrosages: number };

// Transforme une heure (en ms) en "AAAA-MM-JJ", heure locale du téléphone.
function jourLocal(debut: number): string {
  const date = new Date(debut);
  const mois = String(date.getMonth() + 1).padStart(2, '0'); // janvier = 0, d'où le +1
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export function bilanParJour(points: readonly PointHoraire[], seuils: Seuils): BilanJour[] {
  // Dictionnaire "2026-09-29" → ce qu'on a vu ce jour-là.
  const parJour = new Map<string, Jour>();

  // Étape 1 : on range chaque case dans son jour.
  for (let i = 0; i < points.length; i++) {
    const cle = jourLocal(points[i].debut);
    let jour = parJour.get(cle);
    if (jour === undefined) {
      // Premier passage sur ce jour : il apparaît même sans humidité (règle 2).
      jour = { humidites: [], arrosages: 0 };
      parJour.set(cle, jour);
    }

    const humidite = points[i].humidite;
    if (humidite === null) continue; // heure inconnue : on ne compte rien
    jour.humidites.push(humidite);

    // Arrosage : l'heure d'avant est connue ET la hausse est d'au moins 10.
    // Si l'heure d'avant est un trou (null), ça ne compte pas.
    const avant = i > 0 ? points[i - 1].humidite : null;
    if (avant !== null && humidite - avant >= HAUSSE_ARROSAGE) jour.arrosages++;
  }

  // Étape 2 : un bilan par jour, dans l'ordre (la Map garde l'ordre d'ajout).
  const bilans: BilanJour[] = [];
  for (const [cle, jour] of parJour) {
    const n = jour.humidites.length;
    const somme = jour.humidites.reduce((total, h) => total + h, 0);
    bilans.push({
      jour: cle,
      heuresMesurees: n,
      complet: n >= HEURES_COMPLET,
      humiditeMin: n > 0 ? Math.min(...jour.humidites) : null, // aucune heure connue → null
      humiditeMax: n > 0 ? Math.max(...jour.humidites) : null,
      humiditeMoyenne: n > 0 ? Math.round((somme / n) * 10) / 10 : null, // arrondi au dixième
      heuresHorsConfort: jour.humidites.filter((h) => h < seuils.bas || h > seuils.haut).length,
      arrosages: jour.arrosages,
    });
  }
  return bilans;
}
