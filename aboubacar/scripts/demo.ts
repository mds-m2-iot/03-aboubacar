// =====================================================================
//  scripts/demo.ts · montrer l'effet d'une modification, à l'oral
// =====================================================================
//  Lance les 4 fonctions de l'épreuve sur les exemples du sujet et
//  affiche le résultat. On modifie une fonction, on sauvegarde, on relance.
//
//    npm run demo              → tout
//    npm run demo diagnostic   → seulement une partie
//    (diagnostic | serie | bilan | csv)
// =====================================================================
import { mesureVide, type Mesure } from '../src/lib/contrat';
import { diagnostiquer } from '../src/lib/diagnostic';
import { MAINTENANT_EXEMPLE, SEMAINE_EXEMPLE } from '../src/lib/exemple';
import { bilanParJour } from '../src/lib/bilan';
import { versCsv } from '../src/lib/export';
import { FICHE } from '../src/lib/fiche';
import { nettoyerSerie } from '../src/lib/serie';
import type { BesoinsPlante } from '../src/lib/types-epreuve';

const partie = process.argv[2]; // ce qu'on a tapé après « npm run demo »
const montrer = (nom: string) => partie === undefined || partie === nom;

// ---------- Imposée 1 : les exemples du sujet ----------
if (montrer('diagnostic')) {
  console.log('\n=== DIAGNOSTIC (besoins du sujet : 35–70 %, 12–30 °C, lumière 30 %) ===');
  const besoins: BesoinsPlante = {
    humidite: { bas: 35, haut: 70 },
    temperature: { min: 12, max: 30 },
    lumiere: { min: 30 },
  };
  const mardi14h = Date.parse('2026-09-29T14:00:00+02:00');
  const mardi23h = Date.parse('2026-09-29T23:00:00+02:00');

  // Une mesure avec ses 3 valeurs, à une heure donnée.
  function mesure(h: number | null, t: number | null, l: number | null, quand: number): Mesure {
    return { ...mesureVide('demo', quand), humidite: h, temperature: t, lumiere: l };
  }

  const cas: [string, Mesure | null, number][] = [
    ['10 %, 35 °C, 10 %, mardi 14 h', mesure(10, 35, 10, mardi14h), mardi14h],
    ['75 %, 5 °C, 60 %, mardi 14 h', mesure(75, 5, 60, mardi14h), mardi14h],
    ['30 %, temp. null, 60 %', mesure(30, null, 60, mardi14h), mardi14h],
    ['50 %, 20 °C, lumière null, 23 h', mesure(50, 20, null, mardi23h), mardi23h],
    ['mesure vieille de 6 min', mesure(50, 20, 50, mardi14h), mardi14h + 6 * 60 * 1000],
    ['mesure de 5 min pile', mesure(50, 20, 50, mardi14h), mardi14h + 5 * 60 * 1000],
    ['aucune mesure', null, mardi14h],
  ];
  for (const [titre, m, maintenant] of cas) {
    const d = diagnostiquer(m, besoins, maintenant);
    console.log(`${titre.padEnd(34)} → ${d.etat}  problèmes: [${d.problemes.join(', ')}]  non vérifié: [${d.nonVerifie.join(', ')}]`);
  }
}

// ---------- Imposée 2 : la semaine d'exemple ----------
const serie = nettoyerSerie(SEMAINE_EXEMPLE, MAINTENANT_EXEMPLE);
if (montrer('serie')) {
  console.log('\n=== SÉRIE (semaine d\'exemple) ===');
  console.log(`${serie.points.length} cases, couverture ${serie.couverture.toFixed(2)}`);
  for (const trou of serie.trous) {
    const debut = new Date(trou.debut).toLocaleString('fr-FR', { weekday: 'long', hour: 'numeric' });
    const fin = new Date(trou.fin).toLocaleString('fr-FR', { hour: 'numeric' });
    console.log(`trou de ${trou.heures} h : ${debut} → ${fin}`);
  }
}

// ---------- Imposée 3 : le bilan ----------
const bilan = bilanParJour(serie.points, FICHE.seuils);
if (montrer('bilan')) {
  console.log(`\n=== BILAN (seuils ${FICHE.seuils.bas}–${FICHE.seuils.haut}) ===`);
  console.table(bilan);
}

// ---------- Option B : le CSV ----------
if (montrer('csv')) {
  console.log('\n=== CSV ===');
  console.log(versCsv(bilan));
}
