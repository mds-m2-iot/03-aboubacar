// =====================================================================
//  lib/lien.ts · les cinq états d'un lien, quelle que soit la source
// =====================================================================
//  Le pilote Bluetooth de la séance 2 et le client MQTT de la séance 3
//  racontent la même chose au magasin : où en est le lien. Ils partagent
//  donc le même vocabulaire, et l'écran n'a pas à savoir d'où vient la
//  mesure pour dire si elle arrive.
// =====================================================================

export type EtatConnexion =
  /** Rien de démarré. */
  | 'inactive'
  /** Connexion en cours, y compris une nouvelle tentative. */
  | 'connexion'
  /** Le lien tient, les mesures arrivent. */
  | 'connectee'
  /** Le lien est tombé. On peut relancer. */
  | 'perdue'
  /** Rien ne changera sans l'utilisateur : permission refusée, identifiants faux, URL fausse. */
  | 'erreur';

const LIBELLES: Record<EtatConnexion, string> = {
  inactive: 'Aucune source active',
  connexion: 'Connexion en cours',
  connectee: 'Connectée',
  perdue: 'Lien perdu',
  erreur: 'Connexion impossible',
};

export function libelleEtat(etat: EtatConnexion): string {
  return LIBELLES[etat];
}
