// =====================================================================
//  lib/config.ts · les réglages qui viennent du fichier .env
// =====================================================================
//  Séance 3. Rien de ce qui dépend du binôme ou du serveur n'est écrit
//  dans le code : tout vient du .env, que le .gitignore du dépôt exclut.
//  Le .env.example, lui, part dans le dépôt : il donne les noms des
//  clés, sans les valeurs.
//
//  DEUX RÈGLES D'EXPO, ET ELLES NE PARDONNENT PAS.
//
//  1. Chaque variable s'écrit en toutes lettres, process.env.EXPO_PUBLIC_X.
//     Une déstructuration ou un accès entre crochets donne undefined :
//     Expo remplace le texte du code, il ne lit pas un objet.
//
//  2. Tout ce qui commence par EXPO_PUBLIC_ est recopié EN CLAIR dans
//     l'application installée. Parfait pour une adresse. Pour le mot de
//     passe du broker, c'est une solution d'attente assumée : sa vraie
//     place, le trousseau du téléphone, arrive en séance 5.
//
//  Après une modification du .env : rechargement complet de
//  l'application, touche r dans le terminal d'Expo.
// =====================================================================

export const CONFIG = {
  /** wss://…/mqtt : un téléphone parle MQTT par WebSocket, jamais en mqtt://. */
  mqttUrl: process.env.EXPO_PUBLIC_MQTT_URL ?? '',
  mqttUtilisateur: process.env.EXPO_PUBLIC_MQTT_UTILISATEUR ?? '',
  mqttMotDePasse: process.env.EXPO_PUBLIC_MQTT_MOTDEPASSE ?? '',
  /** Le même que ID_BINOME dans firmware/src/config.h, sinon on écoute le voisin. */
  idBinome: process.env.EXPO_PUBLIC_ID_BINOME ?? 'binome-00',
  /** https://… : l'adresse du serveur InfluxDB, sans chemin derrière. */
  influxUrl: process.env.EXPO_PUBLIC_INFLUX_URL ?? '',
  influxOrg: process.env.EXPO_PUBLIC_INFLUX_ORG ?? '',
  influxBucket: process.env.EXPO_PUBLIC_INFLUX_BUCKET ?? '',
  /** Même statut que le mot de passe du broker : en clair, en attendant la séance 5. */
  influxToken: process.env.EXPO_PUBLIC_INFLUX_TOKEN ?? '',
} as const;
