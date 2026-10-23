// =====================================================================
//  lib/mqtt.ts · le téléphone parle au broker, en WebSocket
// =====================================================================
//  Séance 3, atelier « Publier et s'abonner ». Quatre trous à combler,
//  de A à D, dans l'ordre. Tant qu'un trou n'est pas écrit, il se
//  signale sur l'écran d'accueil au lieu de faire planter l'application,
//  exactement comme les trous du firmware sur la console.
//
//  Tout le reste est donné et se lit : la vérification de l'URL, la
//  traduction des erreurs, le démarrage et l'arrêt qui appellent tes
//  quatre fonctions dans le bon ordre.
//
//  PIÈGE NUMÉRO UN DE LA SÉANCE : une application mobile ne parle pas
//  mqtt:// . La carte ouvre une vraie socket TCP sur le port 8883, un
//  moteur JavaScript non. Le téléphone passe donc par WebSocket chiffré,
//  sur le port 443 : wss://mqtt.plante-hub.sergent.dev/mqtt. Même
//  broker, mêmes sujets, mêmes messages, un autre tuyau.
//
//  La reconnexion se fait ici par mqtt.js lui-même, toutes les cinq
//  secondes. En séance 4, on la remplacera par un délai qui grandit à
//  chaque échec, comme sur la carte.
//
//  Références : docs/CONTRAT.md section 5, et la fiche de guidage
//  « Les quatre trous MQTT » du dossier Séance 3.
// =====================================================================
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";

import {
  sujet,
  sujetJoker,
  suffixeDepuisSujet,
  type ChargeLieu,
  type ChargeMesures,
  type ChargeStatut,
  type Commande,
} from "./contrat";
import type { EtatConnexion } from "./lien";
import { parsePlace } from "./place";

/** Ce que le client raconte au reste de l'application, via le magasin. */
export type RappelsMqtt = {
  surEtat: (etat: EtatConnexion, detail?: string) => void;
  /** L'objet complet du sujet « mesures ». */
  surMesures: (charge: ChargeMesures) => void;
  /** L'objet du sujet « statut », testament du broker compris. */
  surStatut: (charge: ChargeStatut) => void;
  /** Séance 6 · le lieu d'une plante de la promo, null quand elle est retirée de la carte. */
  onPlace?: (id: string, place: ChargeLieu | null) => void;
  /** Séance 6 · les mesures de toute la promo, seulement pendant que la carte est ouverte. */
  onMapMeasures?: (id: string, charge: ChargeMesures) => void;
};

export type OptionsMqtt = {
  /** URL complète, en wss:// et terminée par /mqtt. */
  url: string;
  /** Le même que ID_BINOME dans firmware/src/config.h. */
  idBinome: string;
  utilisateur?: string;
  motDePasse?: string;
};

/** Comme le pilote Bluetooth : deux méthodes, et rien de mqtt.js ne dépasse. */
export interface ClientMqtt {
  demarrer: () => void;
  arreter: () => void;
  /** Séance 4 · publie une commande sur « cmd ». false si la connexion n'est pas établie. */
  publishCommand: (commande: Commande) => boolean;
  /** Séance 6 · écoute les mesures de toute la promo, pour la carte. */
  watchMap: (on: boolean) => void;
  /** Séance 6 · publie le lieu, retenu ; null l'efface. false si la connexion n'est pas établie. */
  publishPlace: (place: ChargeLieu | null) => boolean;
}

/** mqtt.js retente toutes les cinq secondes après une coupure. */
const RECONNEXION_MS = 5000;

/** Un trou pas encore écrit se signale, avec son nom, sur l'écran d'accueil. */
function aEcrire(trou: string): never {
  throw new Error(`À écrire en séance 3 : ${trou}, dans lib/mqtt.ts`);
}

/**
 * Vérifie l'URL avant de tenter quoi que ce soit. Donnée.
 * mqtt.js accepte mqtt:// sans broncher, échoue au niveau du transport,
 * et remonte une erreur qui ne parle pas du protocole. Autant refuser
 * ici, avec la phrase qui dit quoi corriger.
 */
export function verifierUrl(url: string): string | null {
  if (!url)
    return "Aucune URL de broker. Renseigne EXPO_PUBLIC_MQTT_URL dans le fichier .env.";
  if (url.startsWith("mqtt://") || url.startsWith("mqtts://")) {
    return "Une application mobile parle MQTT par WebSocket : remplace mqtt:// par wss://, et termine par /mqtt.";
  }
  if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
    return "L'URL du broker doit commencer par wss://.";
  }
  return null;
}

/**
 * Traduit le message brut de mqtt.js en phrase qui dit quoi corriger. Donnée.
 * « Not authorized » est de loin le plus fréquent : un mot de passe vide
 * ou faux dans le .env.
 */
export function traduireErreur(erreur: unknown): string {
  const brut = erreur instanceof Error ? erreur.message : "Erreur MQTT.";
  if (/not authoris|not authorized|bad username/i.test(brut)) {
    return "Identifiants refusés par le broker. Vérifie EXPO_PUBLIC_MQTT_UTILISATEUR et EXPO_PUBLIC_MQTT_MOTDEPASSE dans le .env.";
  }
  if (/websocket|econnrefused|failed/i.test(brut)) {
    return "Le broker ne répond pas à cette adresse. Vérifie l'hôte, le port 443 et le chemin /mqtt.";
  }
  return brut;
}

/** Crée le client MQTT du téléphone. Rien ne se passe avant demarrer(). */
export function creerClientMqtt(
  rappels: RappelsMqtt,
  options: OptionsMqtt,
): ClientMqtt {
  let client: MqttClient | null = null;
  let arrete = false;
  // Le motif du dernier échec, gardé pour rester affiché pendant la
  // tentative suivante. Sans lui, « connexion en cours » efface la seule
  // phrase qui disait quoi corriger.
  let dernierMotif: string | null = null;
  // Séance 6 · la carte : tous les lieux, tout le temps (des messages
  // retenus, minuscules), et toutes les mesures seulement à la demande.
  const SUJET_LIEUX = "plante/+/lieu";
  const SUJET_TOUTES_MESURES = "plante/+/mesures";
  let watchingMap = false;

  /** Donnée. Relaie un état, sauf après un arrêt demandé : un client
   *  qu'on ferme émet encore des évènements, qui ne doivent plus rien
   *  afficher. Utilise-la partout à la place de rappels.surEtat. */
  function signaler(etat: EtatConnexion, detail?: string): void {
    if (arrete) return;
    rappels.surEtat(etat, detail);
  }

  /** Trou A · se connecter et s'abonner. */
  function connecter(): MqttClient {
    // -------------------------------------------------------------
    //  TODO séance 3 · trou A · se connecter et s'abonner
    // -------------------------------------------------------------
    //  À ÉCRIRE : créer le client avec mqtt.connect, et lui dire de
    //  s'abonner à ta plante dès que la connexion est établie.
    //
    //  POURQUOI S'ABONNER DANS « connect » . à chaque reconnexion,
    //  mqtt.js repart d'une session neuve, et les abonnements d'avant
    //  sont perdus. En les refaisant dans l'évènement « connect », ils
    //  reviennent à chaque fois, sans que tu aies à y penser.
    //
    //  LE PIÈGE . un seul abonnement, avec le joker #. Six abonnements,
    //  un par sujet, c'est six allers-retours et six endroits où se
    //  tromper. sujetJoker(), dans lib/contrat.ts, construit le bon.
    //
    //  LE CONTRÔLE . la console d'Expo n'affiche plus l'erreur du trou A,
    //  et l'accueil passe au trou suivant qui manque.
    //
    //  MARCHE À SUIVRE
    //     1. Prépare un objet de type IClientOptions avec cinq réglages :
    //        username et password depuis options.utilisateur et
    //        options.motDePasse, clean à true, reconnectPeriod à
    //        RECONNEXION_MS, et connectTimeout à 8000.
    //     2. Crée le client : mqtt.connect(options.url, tesOptions).
    //     3. Sur son évènement « connect », abonne-le au sujet
    //        sujetJoker(options.idBinome), en qualité de service 0.
    //     4. Rends le client.
    //     5. Supprime l'appel à aEcrire.
    // -------------------------------------------------------------
    const reglages: IClientOptions = {
      username: options.utilisateur,
      password: options.motDePasse,
      clean: true,
      reconnectPeriod: RECONNEXION_MS,
      connectTimeout: 8000,
    };
    const c = mqtt.connect(options.url, reglages);
    c.on('connect', () => {
      c.subscribe(sujetJoker(options.idBinome), { qos: 0 });
    });
    return c;
  }

  /** Trou B · suivre l'état du lien. */
  function suivreEtat(c: MqttClient): void {
    // -------------------------------------------------------------
    //  TODO séance 3 · trou B · suivre l'état du lien
    // -------------------------------------------------------------
    //  À ÉCRIRE : écouter quatre évènements du client et traduire chacun
    //  en un état pour l'écran, avec signaler().
    //
    //  POURQUOI TROIS ÉTATS ET PAS DEUX . « connecté » et « déconnecté »
    //  ne suffisent pas : pendant les cinq secondes où mqtt.js retente,
    //  l'utilisateur doit voir que ça cherche, et pourquoi ça a lâché.
    //
    //  LE PIÈGE . après un refus d'identifiants, mqtt.js émet « error »
    //  PUIS « close ». Si « close » écrase le motif, la seule phrase utile,
    //  « identifiants refusés », disparaît de l'écran. Garde le motif de
    //  l'erreur quand il existe.
    //
    //  LE CONTRÔLE . avec le bon .env, l'accueil passe à « Connectée »,
    //  puis réclame le trou C dès le premier message reçu. Mets ensuite
    //  un mot de passe faux et recharge avec r : l'accueil doit dire
    //  « Identifiants refusés » et le garder pendant les nouvelles
    //  tentatives. Remets le bon mot de passe avant de continuer.
    //
    //  MARCHE À SUIVRE
    //     1. « connect » : remets dernierMotif à null, puis
    //        signaler('connectee').
    //     2. « reconnect » : signaler('connexion', dernierMotif), pour que
    //        le motif reste lisible pendant la nouvelle tentative. Passe
    //        undefined quand il vaut null.
    //     3. « error » : dernierMotif devient traduireErreur(erreur), puis
    //        signaler('erreur', dernierMotif).
    //     4. « close » : si dernierMotif est vide, il devient « Le broker
    //        ne répond plus. Nouvel essai toutes les 5 s. », puis
    //        signaler('perdue', dernierMotif).
    //     5. Supprime l'appel à aEcrire.
    // -------------------------------------------------------------
    c.on('connect', () => {
      dernierMotif = null;
      signaler('connectee');
      // Séance 6 · les lieux de toutes les plantes, pour la carte
      c.subscribe(SUJET_LIEUX, { qos: 1 });
      if (watchingMap) c.subscribe(SUJET_TOUTES_MESURES, { qos: 0 });
    });
    c.on('reconnect', () => {
      signaler('connexion', dernierMotif ?? undefined);
    });
    c.on('error', (erreur) => {
      dernierMotif = traduireErreur(erreur);
      signaler('erreur', dernierMotif);
    });
    c.on('close', () => {
      if (!dernierMotif) {
        dernierMotif = 'Le broker ne répond plus. Nouvel essai toutes les 5 s.';
      }
      signaler('perdue', dernierMotif);
    });
  }

  /** Trou C · décoder et aiguiller un message. */
  function surMessage(sujet: string, charge: { toString(): string }): void {
    // -------------------------------------------------------------
    //  TODO séance 3 · trou C · décoder et aiguiller un message
    // -------------------------------------------------------------
    //  À ÉCRIRE : retrouver de quoi parle le message grâce à son sujet,
    //  transformer la charge en objet, et l'envoyer au bon rappel.
    //
    //  POURQUOI LE SUJET . c'est le sujet qui dit ce que contient le
    //  message, pas le contenu. suffixeDepuisSujet(), déjà écrite dans
    //  lib/contrat.ts, rend « mesures », « statut », « brut »… ou null si
    //  le message n'est pas pour ta plante.
    //
    //  LE PIÈGE . JSON.parse lève une exception sur un message mal formé.
    //  Sans try / catch, un seul message abîmé, publié par une carte mal
    //  flashée, suffit à tout arrêter. Un message illisible s'ignore.
    //
    //  LE CONTRÔLE . souffle sur le capteur : la valeur bouge sur la fiche
    //  de ta plante, sans Bluetooth. Et débranche la carte : au bout
    //  d'une trentaine de secondes, l'accueil annonce la plante hors
    //  ligne, grâce au testament du trou 6.
    //
    //  MARCHE À SUIVRE
    //     1. Calcule le suffixe avec suffixeDepuisSujet(sujet,
    //        options.idBinome). S'il ne vaut ni « mesures » ni « statut »,
    //        sors : les nombres seuls, le brut et nos propres commandes
    //        ne servent pas à l'écran.
    //     2. Dans un try, transforme la charge en objet :
    //        JSON.parse(charge.toString()). Dans le catch, sors sans rien
    //        faire.
    //     3. Si le suffixe vaut « mesures », appelle rappels.surMesures
    //        avec l'objet. Sinon, rappels.surStatut.
    //     4. Supprime l'appel à aEcrire.
    // -------------------------------------------------------------
    const suffixe = suffixeDepuisSujet(sujet, options.idBinome);
    if (suffixe !== 'mesures' && suffixe !== 'statut') return;

    let objet: unknown;
    try {
      objet = JSON.parse(charge.toString());
    } catch {
      return; // message illisible : on l'ignore
    }

    if (suffixe === 'mesures') {
      rappels.surMesures(objet as ChargeMesures);
    } else {
      rappels.surStatut(objet as ChargeStatut);
    }
  }

  /** Trou D · se débrancher proprement. */
  function fermer(): void {
    // -------------------------------------------------------------
    //  TODO séance 3 · trou D · se débrancher proprement
    // -------------------------------------------------------------
    //  À ÉCRIRE : deux lignes. Retirer les écouteurs du client, puis le
    //  fermer sans attendre.
    //
    //  POURQUOI . arreter() est appelée à chaque changement de source, et
    //  à chaque fois que tu enregistres un fichier. Un client qu'on ne
    //  ferme pas reste connecté en arrière-plan : au bout d'une heure
    //  d'atelier, ton téléphone tient trente connexions ouvertes, et le
    //  broker trente fois la promotion.
    //
    //  LE CONTRÔLE . tant que ce trou manque, le terminal d'Expo affiche
    //  un avertissement « trou D » à chaque enregistrement. Une fois
    //  écrit, recharge avec r pour effacer les clients oubliés, puis
    //  bascule trois fois entre Bluetooth et broker dans les réglages :
    //  plus aucun avertissement, et l'accueil repasse à « Connectée ».
    //
    //  MARCHE À SUIVRE
    //     1. Si client est null, sors : il n'y a rien à fermer.
    //     2. client.removeAllListeners(), pour qu'aucun évènement ne
    //        remonte plus jusqu'à l'écran.
    //     3. client.end(true) : le true ferme tout de suite, sans attendre
    //        la fin des échanges en cours.
    //     4. Supprime l'appel à aEcrire.
    // -------------------------------------------------------------
    if (!client) return;
    client.removeAllListeners();
    client.end(true);
  }


  /** Donné. Démarre le client en appelant tes trous dans l'ordre. */
  function demarrer(): void {
    arrete = false;
    const probleme = verifierUrl(options.url);
    if (probleme) {
      rappels.surEtat("erreur", probleme);
      return;
    }
    signaler("connexion", dernierMotif ?? undefined);
    try {
      client = connecter();
      suivreEtat(client);
      client.on("message", (sujet, charge) => {
        // Un client resté ouvert après arreter() ne doit plus rien
        // écrire dans le magasin : c'est le travail du trou D de le
        // fermer, pas celui de l'écran de subir ses messages.
        if (arrete) return;
        try {
          if (routeOtherPlant(sujet, charge)) return;
          surMessage(sujet, charge);
        } catch (erreur) {
          signaler(
            "erreur",
            erreur instanceof Error ? erreur.message : String(erreur),
          );
        }
      });
    } catch (erreur) {
      signaler(
        "erreur",
        erreur instanceof Error ? erreur.message : String(erreur),
      );
    }
  }

  /** Donné. Arrête tout, et le dit une dernière fois à l'écran. */
  function arreter(): void {
    arrete = true;
    dernierMotif = null;
    try {
      fermer();
    } catch (erreur) {
      console.warn(erreur instanceof Error ? erreur.message : erreur);
    }
    client = null;
    rappels.surEtat("inactive");
  }

  /**
   * Séance 4 · publie une commande, seulement si la connexion est établie.
   *
   * Pourquoi tester connected : hors connexion, mqtt.js accepterait le
   * message et le garderait EN MÉMOIRE jusqu'au retour du broker. Une
   * application tuée en arrière-plan le perdrait sans rien dire. On
   * préfère rendre false, et laisser l'appelant écrire la commande dans
   * la file du disque (lib/command-queue.ts).
   *
   * QoS 1 : la carte doit recevoir la commande au moins une fois. Une
   * commande perdue en route ne se voit pas, contrairement à une mesure
   * répétée toutes les deux secondes.
   */
  function publishCommand(commande: Commande): boolean {
    if (arrete || !client || !client.connected) return false;
    client.publish(sujet(options.idBinome, "cmd"), JSON.stringify(commande), { qos: 1 });
    return true;
  }

  /**
   * Séance 6 · publie le lieu de ta plante, RETENU : la carte d'un
   * nouveau venu le reçoit tout de suite. null publie un message vide,
   * retenu lui aussi, qui efface le lieu chez tout le monde.
   */
  function publishPlace(place: ChargeLieu | null): boolean {
    if (arrete || !client || !client.connected) return false;
    client.publish(sujet(options.idBinome, "lieu"), place ? JSON.stringify(place) : "", {
      qos: 1,
      retain: true,
    });
    return true;
  }

  /**
   * Séance 6 · aiguille les lieux, et les mesures des AUTRES plantes.
   * Rend true quand le message est traité ici ; false pour laisser
   * surMessage s'occuper de TA plante, exactement comme avant.
   */
  function routeOtherPlant(topic: string, charge: { toString(): string }): boolean {
    // plante/<id>/<suffixe> : on découpe le sujet pour savoir de qui il parle.
    const parts = topic.split("/");
    if (parts.length !== 3 || parts[0] !== "plante") return false;
    const [, id, suffix] = parts;
    const raw = charge.toString();
    if (suffix === "lieu") {
      rappels.onPlace?.(id, parsePlace(raw));
      return true;
    }
    if (suffix === "mesures" && watchingMap) {
      try {
        rappels.onMapMeasures?.(id, JSON.parse(raw) as ChargeMesures);
      } catch {
        // illisible : la carte garde l'ancienne humeur
      }
    }
    // Ta plante continue son chemin habituel ; les autres s'arrêtent ici.
    return id !== options.idBinome;
  }

  /** Séance 6 · ouvre ou ferme l'écoute de toute la promo. */
  function watchMap(on: boolean): void {
    if (on === watchingMap) return;
    watchingMap = on;
    if (!client?.connected) return;
    if (on) client.subscribe(SUJET_TOUTES_MESURES, { qos: 0 });
    else client.unsubscribe(SUJET_TOUTES_MESURES);
  }

  return { demarrer, arreter, publishCommand, watchMap, publishPlace };
}
