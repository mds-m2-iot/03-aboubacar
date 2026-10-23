// =====================================================================
//  lib/command-queue.ts · la file des commandes, écrite sur le disque
// =====================================================================
//  Séance 4, démo « Persister le cache et rejouer la file » (diapo 19).
//
//  LE PROBLÈME. Dans le métro, l'utilisateur touche « Faire clignoter ».
//  Pas de réseau : la commande part où ? mqtt.js garde bien les messages
//  non envoyés, mais EN MÉMOIRE. Si le système tue l'application en
//  arrière-plan, ce qui arrive tout le temps sur Android, la commande
//  est perdue sans un mot. On l'écrit donc sur le disque.
//
//  TROIS RÈGLES :
//    1. la file vit dans AsyncStorage, pas dans une variable ;
//    2. elle se vide DANS L'ORDRE où elle s'est remplie : calibrer le
//       point sec puis le point humide n'est pas la même chose que
//       l'inverse, et rejouer à l'envers écrase le récent par l'ancien ;
//    3. une commande trop vieille ne part plus : faire clignoter une
//       carte trois heures après la demande n'a plus aucun sens.
// =====================================================================
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Commande } from "./contrat";

export type QueuedCommand = {
  /** Identifiant local, pour afficher la file et la tester. */
  id: string;
  command: Commande;
  /** Quand l'utilisateur a demandé la commande, horloge du téléphone. */
  queuedAt: number;
};

const QUEUE_KEY = "plant.commandQueue";

/** Au-delà d'une heure, une commande en attente est jetée au lieu d'être envoyée. */
export const QUEUE_EXPIRY_MS = 60 * 60 * 1000;

/** Relit la file. Un contenu illisible donne une file vide, jamais un plantage. */
export async function loadQueue(): Promise<QueuedCommand[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedCommand[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedCommand[]): Promise<void> {
  if (queue.length === 0) await AsyncStorage.removeItem(QUEUE_KEY);
  else await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Ajoute une commande EN FIN de file, et rend la file complète. */
export async function enqueue(
  command: Commande,
  now: number = Date.now(),
): Promise<QueuedCommand[]> {
  const queue = await loadQueue();
  queue.push({ id: `${now}-${queue.length}`, command, queuedAt: now });
  await saveQueue(queue);
  return queue;
}

/** Sépare les commandes encore valables des périmées. Fonction pure, testable sans téléphone. */
export function splitExpired(
  queue: QueuedCommand[],
  now: number,
): { fresh: QueuedCommand[]; expired: QueuedCommand[] } {
  const fresh = queue.filter((item) => now - item.queuedAt <= QUEUE_EXPIRY_MS);
  const expired = queue.filter((item) => now - item.queuedAt > QUEUE_EXPIRY_MS);
  return { fresh, expired };
}

export type ReplayResult = { sent: number; dropped: number; left: number };

/** Un seul rejeu à la fois : deux rejeux en parallèle enverraient tout en double. */
let replaying = false;

/**
 * Vide la file dans l'ordre, avec la fonction d'envoi qu'on lui donne.
 *
 * La file ne connaît pas MQTT : send rend true si la commande est
 * partie, false sinon. Au premier refus, on s'arrête et on garde la
 * suite telle quelle : sauter une commande pour envoyer la suivante
 * casserait l'ordre.
 */
export async function replayQueue(
  send: (command: Commande) => boolean,
  now: number = Date.now(),
): Promise<ReplayResult> {
  if (replaying)
    return { sent: 0, dropped: 0, left: (await loadQueue()).length };
  replaying = true;
  try {
    const { fresh, expired } = splitExpired(await loadQueue(), now);
    let sent = 0;
    while (sent < fresh.length && send(fresh[sent].command)) sent += 1;
    const left = fresh.slice(sent);
    await saveQueue(left);
    return { sent, dropped: expired.length, left: left.length };
  } finally {
    replaying = false;
  }
}

/** Vide la file sans rien envoyer. Le bouton « effacer mes données » l'appellera aussi. */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
