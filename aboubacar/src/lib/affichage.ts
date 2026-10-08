// =====================================================================
//  lib/affichage.ts · mettre un nombre en forme, et savoir quelle heure il est
// =====================================================================
//  Trois petites choses que tous les écrans partagent. Un nombre absent
//  s'affiche en tiret et jamais en zéro, un nombre présent s'écrit avec
//  une virgule, et l'âge d'une mesure se dit en clair.
// =====================================================================
import { useEffect, useState } from 'react';

/** 28.47 devient « 28,5 », null devient « – ». */
export function formaterValeur(valeur: number | null, decimales = 1): string {
  if (valeur === null) return '–';
  return valeur.toFixed(decimales).replace('.', ',');
}

/** L'âge d'une mesure, en secondes puis en minutes. */
export function formaterAnciennete(horodatage: number, maintenant: number): string {
  const secondes = Math.max(0, Math.round((maintenant - horodatage) / 1000));
  if (secondes < 60) return `il y a ${secondes} s`;
  return `il y a ${Math.floor(secondes / 60)} min`;
}

/**
 * L'heure courante, rafraîchie à intervalle régulier.
 *
 * Sans ce hook, un écran ne se redessine que quand une mesure arrive. Or
 * c'est précisément quand plus rien n'arrive qu'il faut passer à
 * « donnée périmée » : c'est le temps qui passe qui doit redessiner.
 */
export function useMaintenant(periodeMs = 1000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), periodeMs);
    return () => clearInterval(minuteur);
  }, [periodeMs]);
  return maintenant;
}
