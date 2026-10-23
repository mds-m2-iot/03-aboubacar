import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { creerPiloteBle } from "../lib/ble";
import { loadQueue, replayQueue } from "../lib/command-queue";
import { CONFIG } from "../lib/config";
import { FICHE } from "../lib/fiche";
import { creerClientMqtt } from "../lib/mqtt";
import { CACHE_MAX_AGE, persister, queryClient } from "../lib/queryClient";
import { useMap } from "../store/map";
import { usePlante } from "../store/plante";

/**
 * Branche la source choisie (Bluetooth ou broker MQTT) sur le magasin,
 * une seule fois pour toute l'application : un écran se démonte à chaque
 * changement d'onglet, et la carte n'accepte qu'une connexion.
 */
function useSource(): void {
  const source = usePlante((etat) => etat.source);
  const tentative = usePlante((etat) => etat.tentative);

  useEffect(() => {
    const { definirEtatConnexion, majValeur, appliquerMesuresMqtt, definirStatut } =
      usePlante.getState();

    if (source === "ble") {
      const pilote = creerPiloteBle(
        { surEtat: definirEtatConnexion, surValeur: majValeur },
        { nomAttendu: FICHE.nomAnnonce },
      );
      void pilote.demarrer();
      return () => {
        void pilote.arreter();
      };
    }

    const client = creerClientMqtt(
      {
        surEtat: definirEtatConnexion,
        surMesures: appliquerMesuresMqtt,
        surStatut: definirStatut,
        onPlace: (id, place) => useMap.getState().applyPlace(id, place),
        onMapMeasures: (id, charge) => useMap.getState().applyMeasure(id, charge),
      },
      {
        url: CONFIG.mqttUrl,
        idBinome: CONFIG.idBinome,
        utilisateur: CONFIG.mqttUtilisateur,
        motDePasse: CONFIG.mqttMotDePasse,
      },
    );
    client.demarrer();
    // Séance 4 · les écrans envoient leurs commandes par ce client.
    usePlante.getState().setPublishCommand(client.publishCommand);
    // Séance 6 · la carte : publier son lieu, et n'écouter toute la promo
    // que pendant que l'écran de carte est ouvert.
    useMap.getState().setPublishPlace(client.publishPlace);
    client.watchMap(useMap.getState().watching);
    const stopWatching = useMap.subscribe((state, previous) => {
      if (state.watching !== previous.watching) client.watchMap(state.watching);
    });
    return () => {
      stopWatching();
      useMap.getState().setPublishPlace(null);
      usePlante.getState().setPublishCommand(null);
      client.arreter();
    };
  }, [source, tentative]);
}

/**
 * Séance 4 · rejoue la file des commandes dès que le BROKER répond.
 *
 * Pourquoi pas au retour du réseau : le réseau revenu ne veut pas dire
 * broker joignable. Le WiFi d'un hôtel répond, mais sa page de
 * connexion bloque tout le reste. On attend donc l'état « connectee »,
 * qui vient du broker lui-même.
 */
function useReplayQueue(): void {
  useEffect(() => {
    // Au démarrage, la file du disque peut déjà contenir des commandes.
    void loadQueue().then((queue) => usePlante.getState().setPendingCommands(queue.length));

    return usePlante.subscribe((state, previous) => {
      if (state.etatConnexion !== "connectee" || previous.etatConnexion === "connectee") return;
      const publish = state.publishCommand;
      if (!publish) return;
      void replayQueue(publish).then((result) => {
        usePlante.getState().setPendingCommands(result.left);
        if (result.sent > 0 || result.dropped > 0) {
          console.log(
            `[file] ${result.sent} commande(s) rejouée(s), ${result.dropped} périmée(s) jetée(s)`,
          );
        }
      });
    });
  }, []);
}

export default function RootLayout() {
  useSource();
  useReplayQueue();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE }}
    >
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="plante/[id]" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
