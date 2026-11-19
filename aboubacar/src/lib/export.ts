// =====================================================================
//  lib/export.ts · option B, exporter la semaine
// =====================================================================
//  Transforme le bilan de la semaine en texte CSV lisible par Excel.
// =====================================================================
import type { BilanJour } from './types-epreuve';

// Les règles du CSV français : « ; » entre colonnes, fin de ligne Windows.
const SEPARATEUR = ";";
const FIN_DE_LIGNE = "\r\n";
const EN_TETE =
  "jour;heures_mesurees;complet;humidite_min;humidite_max;humidite_moyenne;heures_hors_confort;arrosages";

// nombreCsv : écrit un nombre pour Excel.
// null → case vide ; sinon une décimale au plus et une virgule (61.2 → "61,2").
function nombreCsv(valeur: number | null): string {
  if (valeur === null) return "";
  const arrondi = Math.round(valeur * 10) / 10;
  return String(arrondi).replace(".", ",");
}

// versCsv : rend le CSV complet de la semaine.
// D'abord l'en-tête, puis une ligne par jour : on met les 8 champs dans
// un tableau et on les colle avec « ; ».
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
