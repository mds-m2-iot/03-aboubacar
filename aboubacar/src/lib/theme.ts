// =====================================================================
//  lib/theme.ts · la palette et les espacements, a un seul endroit
// =====================================================================
//  Palette « serre » : un fond creme chaud, des taches de couleur
//  douces derriere, et des cartes en verre par-dessus. Le verre n'a
//  d'interet que s'il a quelque chose a laisser transparaitre : ce sont
//  les taches du fond (voir src/components/Fond.tsx).
//
//  L'accent vert feuille est reserve a ce qui va bien et a l'element
//  actif : s'il sert partout, il ne signale plus rien.
// =====================================================================

export const COULEURS = {
  /** Fond de toutes les pages, creme chaud. */
  fond: '#F5EFE6',
  /** Fond plein, pour ce qui doit rester opaque (texte sur bouton plein). */
  carte: '#FFFDF9',
  /** Verre simule, quand le liquid glass natif n'existe pas (Android, iOS < 26). */
  verre: 'rgba(255, 253, 249, 0.55)',
  /** Liseré clair qui donne l'arete du verre. */
  bordVerre: 'rgba(255, 255, 255, 0.7)',
  /** Texte principal, vert tres sombre plutot que noir pur. */
  texte: '#1F2A1C',
  /** Texte secondaire, legendes, unites. */
  gris: '#6E675C',
  /** Accent vert feuille, reserve a l'etat confortable et a l'element actif. */
  accent: '#3F7D3A',
  /** Filets et separateurs. */
  filet: 'rgba(31, 42, 28, 0.12)',
  /** Les taches de couleur du fond, derriere le verre. */
  tacheSauge: '#B7CFA0',
  tachePeche: '#F4C7A1',
  tacheRose: '#E9B7B3',
} as const;

export const ESPACES = {
  petit: 8,
  moyen: 16,
  grand: 24,
} as const;

export const RAYONS = {
  carte: 24,
  bouton: 999,
} as const;
