// =====================================================================
//  lib/place.ts · arrondir, construire, relire la position de la plante
// =====================================================================
//  Séance 6. Règle : la position ne part jamais sans être passée par
//  buildPlace.
//
//  LE PIÈGE : toFixed(2). Il rend du texte, « 47.22 », et un JSON qui
//  contient du texte à la place d'un nombre casse la carte de tout le
//  monde. Math.round sur un nombre mis à l'échelle rend un nombre.
// =====================================================================
import type { ChargeLieu } from './contrat';

/** Deux décimales : environ 1,1 km en latitude, l'échelle d'un quartier. */
export const PLACE_DECIMALS = 2;

/** Arrondit une coordonnée. Math.round sur un nombre mis à l'échelle, pas toFixed, qui rend du texte. */
export function roundCoordinate(value: number, decimals: number = PLACE_DECIMALS): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Une position plausible : des nombres finis, dans les bornes du globe. */
export function isValidPlace(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** La charge à publier, déjà arrondie. null si la position est absurde. */
export function buildPlace(lat: number, lon: number, nom: string): ChargeLieu | null {
  if (!isValidPlace(lat, lon)) return null;
  return { lat: roundCoordinate(lat), lon: roundCoordinate(lon), nom: nom.slice(0, 40) };
}

/**
 * Lit une charge reçue. Un message vide (plante retirée) ou illisible
 * donne null. On ré-arrondit à la lecture : une application mal écrite
 * qui publierait la position exacte ne la verrait pas affichée ici.
 */
export function parsePlace(raw: string): ChargeLieu | null {
  if (raw.trim() === '') return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { lat, lon, nom } = value as Partial<ChargeLieu>;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    return buildPlace(lat, lon, typeof nom === 'string' ? nom : '');
  } catch {
    return null;
  }
}

/** Centre de départ de la carte : Nantes. */
export const MAP_CENTER = { lat: 47.22, lon: -1.55, zoom: 12 } as const;
