// =====================================================================
//  lib/queryClient.ts · le cache des requêtes, TanStack Query
// =====================================================================
//  Séance 4. Un seul QueryClient pour toute l'application : il garde la
//  réponse de chaque requête sous une clé, et un écran qui la redemande
//  reçoit le cache tout de suite pendant qu'une nouvelle requête part.
//
//  Trois branchements propres au téléphone, que le web fait tout seul :
//  1. NetInfo dit à TanStack si le réseau est là : hors ligne, il met
//     les requêtes en pause au lieu de les faire échouer.
//  2. AppState joue le rôle du focus de fenêtre : quand l'application
//     revient au premier plan, les données périmées sont redemandées.
//  3. AsyncStorage garde le cache entre deux lancements : la courbe
//     s'affiche à l'ouverture, avant même que le réseau réponde.
// =====================================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { AppState } from "react-native";

const MINUTE = 60 * 1000;
const HEURE = 60 * MINUTE;

/** Durée de vie du cache sur le disque. Au-delà, il est jeté à l'ouverture. */
export const CACHE_MAX_AGE = 24 * HEURE;

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((etat) => setOnline(etat.isConnected !== false)),
);

focusManager.setEventListener((handleFocus) => {
  const abonnement = AppState.addEventListener("change", (etat) =>
    handleFocus(etat === "active"),
  );
  return () => abonnement.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** La carte mesure en continu : au-delà d'une minute, on redemande. */
      staleTime: MINUTE,
      /** Doit couvrir CACHE_MAX_AGE, sinon le cache meurt avant d'être sauvé. */
      gcTime: CACHE_MAX_AGE,
      retry: 2,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "plante-cache-requetes",
});
