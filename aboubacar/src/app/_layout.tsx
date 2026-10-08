import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { creerPiloteBle } from "../lib/ble";
import { CONFIG } from "../lib/config";
import { FICHE } from "../lib/fiche";
import { creerClientMqtt } from "../lib/mqtt";
import { CACHE_MAX_AGE, persister, queryClient } from "../lib/queryClient";
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
      { surEtat: definirEtatConnexion, surMesures: appliquerMesuresMqtt, surStatut: definirStatut },
      {
        url: CONFIG.mqttUrl,
        idBinome: CONFIG.idBinome,
        utilisateur: CONFIG.mqttUtilisateur,
        motDePasse: CONFIG.mqttMotDePasse,
      },
    );
    client.demarrer();
    return () => client.arreter();
  }, [source, tentative]);
}

export default function RootLayout() {
  useSource();

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
