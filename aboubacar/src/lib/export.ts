// =====================================================================
//  lib/export.ts · option B, exporter la semaine
// =====================================================================
//  À garder seulement si c'est ton option. Signature fixée par le sujet.
// =====================================================================
import type { BilanJour } from './types-epreuve';

const SEPARATEUR = ";";
const FIN_DE_LIGNE = "\r\n";
const EN_TETE =
  "jour;heures_mesurees;complet;humidite_min;humidite_max;humidite_moyenne;heures_hors_confort;arrosages";

function nombreCsv(valeur: number | null): string {
  if (valeur === null) return "";
  const arrondi = Math.round(valeur * 10) / 10;
  return String(arrondi).replace(".", ",");
}

export function versCsv(bilan: readonly BilanJour[]): string {
  let csv = EN_TETE + FIN_DE_LIGNE;
  for (const jour of bilan) {
    const champs = [
      jour.jour,
      nombreCsv(jour.heuresMesurees),
      jour.complet ? "oui" : "non",
      nombreCsv(jour.humiditeMin),
      nombreCsv(jour.humiditeMax),
      nombreCsv(jour.humiditeMoyenne),
      nombreCsv(jour.heuresHorsConfort),
      nombreCsv(jour.arrosages),
    ];
    csv += champs.join(SEPARATEUR) + FIN_DE_LIGNE;
  }
  return csv;
}
