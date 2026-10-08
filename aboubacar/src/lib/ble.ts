// =====================================================================
//  lib/ble.ts · scanner, se connecter, écouter trois caractéristiques
// =====================================================================
//  Corrigé de l'atelier 2.3, « Ta plante parle enfin ».
//
//  Le chemin le plus court entre la carte et le téléphone : aucun
//  serveur, aucun réseau, deux mètres de portée. Les étapes sont celles
//  de la fiche de guidage, et leur ordre compte :
//    1. les permissions, qui dépendent de la version d'Android ;
//    2. l'adaptateur, qui doit être allumé ;
//    3. la reprise d'une carte déjà connectée, AVANT tout scan ;
//    4. le scan filtré sur le service, arrêté AVANT connect() ;
//    5. la découverte des services, puis l'abonnement aux trois mesures ;
//    6. le décodage des octets, et le nettoyage quand on s'arrête.
//
//  CE QUI N'EST PAS ICI, EXPRÈS. La reconnexion automatique, avec un
//  délai qui grandit à chaque échec, s'écrit en séance 4. Aujourd'hui,
//  quand le lien tombe, le pilote le dit avec son motif, et c'est
//  l'utilisateur qui relance depuis l'écran d'accueil.
//
//  LE MODULE NATIF. react-native-ble-plx contient du code natif, absent
//  d'Expo Go et du web. On importe ses types avec « import type », qui
//  disparaît à la compilation, et on ne charge le module qu'au moment où
//  le pilote démarre vraiment. Un écran qui importe ce fichier ne fait
//  donc rien charger du tout.
//
//  Les cinq états du lien sont dans lib/lien.ts, partagés avec MQTT.
//
//  Référence : docs/CONTRAT.md, section 4.
// =====================================================================
import { PermissionsAndroid, Platform } from 'react-native';

import type { BleManager, Characteristic, Device, Subscription } from 'react-native-ble-plx';

import type { EtatConnexion } from './lien';
import {
  UUID,
  base64VersOctets,
  centiemesVersReel,
  decoderInt16LE,
  decoderUint16LE,
} from './contrat';

/** Les trois grandeurs qui arrivent par notification. */
export type ChampBle = 'humidite' | 'temperature' | 'lumiere';

/** Ce que le pilote raconte au reste de l'application. */
export type RappelsBle = {
  /** Changement d'état du lien, avec un détail affichable. */
  surEtat: (etat: EtatConnexion, detail?: string) => void;
  /** Une valeur décodée, déjà divisée par 100. */
  surValeur: (champ: ChampBle, valeur: number) => void;
};

export type OptionsBle = {
  /**
   * Le nom annoncé par la carte, NOM_PLANTE dans firmware/src/config.h.
   * Toutes les cartes de la salle annoncent le même service : sans ce
   * filtre, on se branche sur la première qui répond, souvent celle du
   * binôme d'à côté.
   */
  nomAttendu?: string;
  /** Durée du scan avant abandon, en millisecondes. */
  dureeScanMs?: number;
};

/**
 * Ce que l'application connaît du pilote : deux méthodes, et aucun type
 * de react-native-ble-plx. C'est ce qui permettra en séance 3 de brancher
 * une autre source, le broker, sans toucher aux écrans.
 */
export interface PiloteBle {
  demarrer: () => Promise<void>;
  arreter: () => Promise<void>;
}

const DUREE_SCAN_DEFAUT_MS = 15000;

/**
 * Étape 1 · les permissions.
 *
 * Android 12 et au-delà (version 31) : BLUETOOTH_SCAN et BLUETOOTH_CONNECT.
 * Android 11 et avant : ACCESS_FINE_LOCATION, parce que le système estime
 * que la liste des appareils proches suffit à deviner où l'on est. Non,
 * l'application ne cherche pas la position de l'utilisateur.
 *
 * On teste la version au lieu de tout demander d'un coup : une permission
 * qui n'existe pas sur la version courante fait échouer la demande entière.
 */
export async function demanderPermissionsBle(): Promise<boolean> {
  // iOS déclare sa permission dans app.json, le système la demande seul.
  if (Platform.OS !== 'android') return true;

  // Platform.Version arrive tantôt en nombre, tantôt en chaîne.
  const version =
    typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  const permissions =
    version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const resultats = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(resultats).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

/**
 * Étape 6 · le décodage d'une caractéristique de mesure.
 *
 * Deux octets, petit-boutiste, valeur multipliée par 100. La température
 * est la seule des trois à être signée : décodée en non signé, -3,5 °C
 * deviendrait 651,86 °C. Rend null quand la valeur est absente ou l'UUID
 * inconnu, et null n'est pas zéro.
 *
 * Exportée pour être testable sans téléphone : c'est la seule partie du
 * Bluetooth qui contient de la logique.
 */
export function decoderCaracteristique(uuid: string, valeurBase64: string | null): number | null {
  if (!valeurBase64) return null;
  const octets = base64VersOctets(valeurBase64);
  // ble-plx rend l'UUID en minuscules sur Android, parfois en majuscules
  // sur iOS : on compare toujours en minuscules.
  const compare = uuid.toLowerCase();
  if (compare === UUID.TEMPERATURE) return centiemesVersReel(decoderInt16LE(octets));
  if (compare === UUID.HUMIDITE || compare === UUID.LUMIERE) {
    return centiemesVersReel(decoderUint16LE(octets));
  }
  return null;
}

/** Associe un UUID de caractéristique au champ correspondant. */
function champDepuisUuid(uuid: string): ChampBle | null {
  switch (uuid.toLowerCase()) {
    case UUID.HUMIDITE:
      return 'humidite';
    case UUID.TEMPERATURE:
      return 'temperature';
    case UUID.LUMIERE:
      return 'lumiere';
    default:
      return null;
  }
}

/** Crée le pilote Bluetooth. Rien ne se passe avant demarrer(). */
export function creerPiloteBle(rappels: RappelsBle, options: OptionsBle = {}): PiloteBle {
  const dureeScanMs = options.dureeScanMs ?? DUREE_SCAN_DEFAUT_MS;

  // Tout ce qui doit survivre entre deux appels vit ici, dans la portée
  // de la fonction, et non dans le module : deux pilotes créés l'un
  // après l'autre ne partagent jamais leur état.
  let manager: BleManager | null = null;
  let appareil: Device | null = null;
  let abonnements: Subscription[] = [];
  let surveillance: Subscription | null = null;
  let minuteurScan: ReturnType<typeof setTimeout> | null = null;
  let abandonnerScan: ((raison: Error) => void) | null = null;
  let enCours = false;
  let arrete = false;
  // Le motif du dernier échec, gardé pour rester affiché pendant la
  // tentative suivante. Sans lui, « connexion en cours » efface la raison
  // et l'utilisateur regarde quinze secondes d'écran muet.
  let dernierMotif: string | null = null;

  /** Charge le module natif au dernier moment, avec un message utile. */
  function chargerModule(): typeof import('react-native-ble-plx') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('react-native-ble-plx') as typeof import('react-native-ble-plx');
    } catch {
      throw new Error(
        'Le Bluetooth demande une compilation de développement (npx expo run:android), il ne marche pas dans Expo Go.',
      );
    }
  }

  /** Vrai si l'appareil porte le nom attendu, ou si aucun nom n'est imposé. */
  function correspond(candidat: Device): boolean {
    if (!options.nomAttendu) return true;
    return candidat.name === options.nomAttendu || candidat.localName === options.nomAttendu;
  }

  function nettoyerAbonnements(): void {
    abonnements.forEach((a) => a.remove());
    abonnements = [];
    surveillance?.remove();
    surveillance = null;
  }

  function arreterScan(): void {
    if (minuteurScan !== null) {
      clearTimeout(minuteurScan);
      minuteurScan = null;
    }
    abandonnerScan = null;
    manager?.stopDeviceScan().catch(() => undefined);
  }

  /** Étape 4 · le scan, qui s'arrête au premier appareil qui correspond. */
  function scanner(instance: BleManager): Promise<Device> {
    return new Promise<Device>((resoudre, rejeter) => {
      abandonnerScan = rejeter;
      minuteurScan = setTimeout(() => {
        arreterScan();
        const qui = options.nomAttendu ? `Aucune plante nommée « ${options.nomAttendu} »` : 'Aucune plante';
        rejeter(new Error(`${qui} trouvée. Vérifie que la carte est alimentée et à portée.`));
      }, dureeScanMs);

      // On filtre sur le SERVICE, jamais sur le seul nom : deux binômes
      // voisins peuvent avoir appelé leur plante pareil.
      instance.startDeviceScan([UUID.SERVICE], null, (erreur, trouve) => {
        if (erreur) {
          arreterScan();
          rejeter(erreur);
          return;
        }
        if (!trouve || !correspond(trouve)) return;

        // Ici, et nulle part ailleurs : le scan s'arrête AVANT connect().
        // Un scan laissé en route fait échouer la connexion une fois sur
        // deux, avec un symptôme différent à chaque essai.
        arreterScan();
        resoudre(trouve);
      });
    });
  }

  /** Étape 5 · la découverte, puis les trois abonnements. */
  async function souscrire(cible: Device): Promise<void> {
    // Jamais optionnel : sans découverte, l'abonnement échoue avec une
    // erreur de caractéristique introuvable alors que l'UUID est juste.
    await cible.discoverAllServicesAndCharacteristics();

    const surNotification = (erreur: unknown, caracteristique: Characteristic | null): void => {
      if (erreur || !caracteristique) return;
      const champ = champDepuisUuid(caracteristique.uuid);
      if (!champ) return;
      const valeur = decoderCaracteristique(caracteristique.uuid, caracteristique.value);
      if (valeur !== null) rappels.surValeur(champ, valeur);
    };

    // La carte pousse une notification toutes les deux secondes : on
    // n'a rien à demander, on écoute.
    for (const uuid of [UUID.HUMIDITE, UUID.TEMPERATURE, UUID.LUMIERE]) {
      abonnements.push(cible.monitorCharacteristicForService(UUID.SERVICE, uuid, surNotification));
    }
  }

  async function demarrer(): Promise<void> {
    // Déjà connecté, ou déjà en train d'essayer : on ne lance pas un
    // deuxième scan par-dessus le premier.
    if (appareil || enCours) return;
    enCours = true;
    arrete = false;
    rappels.surEtat('connexion', dernierMotif ?? undefined);

    try {
      // Étape 1
      const autorise = await demanderPermissionsBle();
      if (!autorise) {
        rappels.surEtat(
          'erreur',
          'Permission Bluetooth refusée. Autorise-la dans les réglages du téléphone, puis relance.',
        );
        return;
      }

      // Étape 2 · un adaptateur éteint donne un scan qui ne trouve rien,
      // sans la moindre erreur. On transforme cette panne muette en phrase.
      const module = chargerModule();
      manager ??= new module.BleManager();
      const etatAdaptateur = await manager.state();
      if (etatAdaptateur !== module.State.PoweredOn) {
        rappels.surEtat('erreur', 'Le Bluetooth du téléphone est éteint.');
        return;
      }

      // Étape 3 · la reprise. Une carte connectée n'annonce plus rien,
      // donc un scan ne la trouvera jamais. C'est ce qui arrive à chaque
      // rechargement complet du code : le JavaScript repart de zéro, la
      // connexion native, elle, lui survit. On la reprend telle quelle.
      const dejaConnectes = await manager.connectedDevices([UUID.SERVICE]);
      const repris = dejaConnectes.find(correspond);
      const cible = repris ?? (await (await scanner(manager)).connect());

      // L'utilisateur a pu tout arrêter pendant qu'on attendait.
      if (arrete) {
        await cible.cancelConnection().catch(() => undefined);
        return;
      }

      appareil = cible;
      await souscrire(cible);

      // Une carte qu'on débranche ne prévient personne : c'est le
      // téléphone qui constate la coupure.
      surveillance = cible.onDisconnected(() => {
        abonnements.forEach((a) => a.remove());
        abonnements = [];
        appareil = null;
        if (arrete) return;
        dernierMotif = "La plante s'est déconnectée. Rapproche-toi, puis relance.";
        rappels.surEtat('perdue', dernierMotif);
      });

      dernierMotif = null;
      rappels.surEtat('connectee', cible.name ?? cible.localName ?? undefined);
    } catch (erreur) {
      if (arrete) return;
      nettoyerAbonnements();
      appareil = null;
      dernierMotif = erreur instanceof Error ? erreur.message : 'Erreur Bluetooth inconnue.';
      rappels.surEtat('perdue', dernierMotif);
    } finally {
      enCours = false;
    }
  }

  async function arreter(): Promise<void> {
    arrete = true;
    dernierMotif = null;
    abandonnerScan?.(new Error('Arrêt demandé.'));
    arreterScan();
    nettoyerAbonnements();
    if (appareil) {
      try {
        await appareil.cancelConnection();
      } catch {
        // Déjà déconnectée : rien à signaler.
      }
      appareil = null;
    }
    // Le manager reste en vie : le détruire et le recréer à chaque
    // aller-retour fait clignoter la pile Bluetooth du téléphone.
    rappels.surEtat('inactive');
  }

  return { demarrer, arreter };
}
