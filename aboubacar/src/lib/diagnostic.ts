// =====================================================================
//  lib/diagnostic.ts · imposée 1, le diagnostic
// =====================================================================
//  Épreuve individuelle. La signature est fixée par le sujet : ne change
//  ni le nom, ni les paramètres, ni le type rendu. Les règles sont dans
//  le sujet, section « Imposée 1 ». Le reste t'appartient.
// =====================================================================
import type { Mesure } from './contrat';
import type { BesoinsPlante, Diagnostic } from './types-epreuve';

export function diagnostiquer(
  mesure: Mesure | null,
  besoins: BesoinsPlante,
  maintenant: number,
): Diagnostic {
  throw new Error('À écrire : diagnostiquer, dans lib/diagnostic.ts');
}
