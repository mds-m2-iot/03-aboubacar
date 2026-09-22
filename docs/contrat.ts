// =====================================================================
//  lib/contrat.ts · la copie TypeScript de docs/CONTRAT.md
// =====================================================================
//  Ce fichier existe pour une seule raison : il ne doit y avoir qu'un
//  endroit dans l'application où un UUID, un sujet MQTT ou une borne de
//  calibration est écrit. Le jour où le contrat bouge, on modifie ce
//  fichier, et le compilateur montre tous les endroits à reprendre.
//
//  Règle du module : rien ici ne dépend de React, de react-native ni
//  d'un module natif. Ce fichier doit rester lisible et testable seul.
//
//  Référence : docs/CONTRAT.md, version 1.0.0.
// =====================================================================

/** Version du contrat implémentée ici. Doit correspondre à docs/CONTRAT.md. */
export const VERSION_CONTRAT = '1.0.0';

// ---------------------------------------------------------------------
//  1. Bluetooth Low Energy (contrat, section 4)
// ---------------------------------------------------------------------
//  Les UUID sont recopiés à l'identique depuis firmware/src/bluetooth.h.
//  Une faute de frappe ici donne un scan qui ne trouve rien, sans erreur :
//  c'est la panne la plus coûteuse en temps de la séance 2.

export const UUID = {
  /** Service Plante annoncé par la carte. */
  SERVICE: '6d5a0001-9b7d-4c2a-8f10-2b1e5a7c3d40',
  /** Humidité du sol, pourcentage ×100, uint16 petit-boutiste. */
  HUMIDITE: '6d5a0002-9b7d-4c2a-8f10-2b1e5a7c3d40',
  /** Température, degrés Celsius ×100, int16 petit-boutiste (peut être négative). */
  TEMPERATURE: '6d5a0003-9b7d-4c2a-8f10-2b1e5a7c3d40',
  /** Lumière, pourcentage ×100, uint16 petit-boutiste. */
  LUMIERE: '6d5a0004-9b7d-4c2a-8f10-2b1e5a7c3d40',
  /** Statut JSON, lecture seule, même objet que le sujet MQTT « statut ». */
  STATUT: '6d5a0005-9b7d-4c2a-8f10-2b1e5a7c3d40',
} as const;

/** Nom annoncé par défaut par la carte du kit (constante NOM_PLANTE du firmware). */
export const NOM_ANNONCE_DEFAUT = 'Plante-Demo';

// ---------------------------------------------------------------------
//  2. MQTT (contrat, section 5)
// ---------------------------------------------------------------------

/** Les suffixes de sujet publiés par la carte, plus le sujet de commande. */
export const SUFFIXES_SUJET = [
  'humidite',
  'temperature',
  'lumiere',
  'mesures',
  'statut',
  'brut',
  'cmd',
] as const;

export type SuffixeSujet = (typeof SUFFIXES_SUJET)[number];

/**
 * Construit le préfixe de sujet d'un binôme.
 * Le contrat interdit d'y mettre un nom de personne ou une position :
 * le sujet circule en clair sur le broker, tout le monde le voit.
 */
export function prefixeSujet(idBinome: string): string {
  return `plante/${idBinome}`;
}

/** Sujet complet, par exemple « plante/binome-03/mesures ». */
export function sujet(idBinome: string, suffixe: SuffixeSujet): string {
  return `${prefixeSujet(idBinome)}/${suffixe}`;
}

/**
 * Sujet à joker pour tout écouter d'un coup.
 * On s'abonne une fois à « plante/<id>/# » plutôt que sept fois à sept
 * sujets : moins d'allers-retours à la connexion, et un seul point de
 * décodage à maintenir dans le gestionnaire de messages.
 */
export function sujetJoker(idBinome: string): string {
  return `${prefixeSujet(idBinome)}/#`;
}

/**
 * Retrouve le suffixe à partir du sujet complet reçu du broker.
 * Renvoie null si le sujet n'appartient pas au binôme demandé, ce qui
 * arrive dès qu'un abonnement traîne après un changement d'identifiant.
 */
export function suffixeDepuisSujet(sujetComplet: string, idBinome: string): SuffixeSujet | null {
  const prefixe = `${prefixeSujet(idBinome)}/`;
  if (!sujetComplet.startsWith(prefixe)) return null;
  const reste = sujetComplet.slice(prefixe.length);
  return (SUFFIXES_SUJET as readonly string[]).includes(reste) ? (reste as SuffixeSujet) : null;
}

// ---------------------------------------------------------------------
//  3. Charges utiles (contrat, section 5)
// ---------------------------------------------------------------------

/** Objet publié sur « plante/<id>/mesures ». Les clés sont figées par le contrat. */
export type ChargeMesures = {
  humidite: number;
  temperature: number;
  lumiere: number;
  humidite_air: number;
  humeur: string;
  uptime: number;
  version: string;
};

/** Objet publié sur « plante/<id>/statut », en message retenu. */
export type ChargeStatut = {
  en_ligne: boolean;
  nom?: string;
  version?: string;
  mode?: ModeCarte;
  rssi?: number;
  ip?: string;
};

/** Objet publié sur « plante/<id>/brut ». Sert uniquement à la calibration. */
export type ChargeBrut = {
  humidite: number;
  lumiere: number;
};

/** Modes de fonctionnement du firmware (contrat, section 7). */
export type ModeCarte = 'ble' | 'dual' | 'demo';

/** Commandes acceptées par la carte sur « plante/<id>/cmd ». */
export type Commande =
  | { action: 'identifier' }
  | { action: 'calibrer'; point: 'sec' | 'humide' }
  | { action: 'periode'; ms: number }
  | { action: 'maj' };

// ---------------------------------------------------------------------
//  4. Le modèle de données de l'application
// ---------------------------------------------------------------------

/** D'où vient la donnée affichée. Sert à expliquer l'écran à l'utilisateur. */
export type SourceDonnees = 'ble' | 'mqtt' | 'demo';

/**
 * Une mesure telle que l'application la manipule.
 *
 * Chaque grandeur peut valoir null, et null n'est pas zéro : une sonde
 * muette ne veut pas dire « 0 % d'humidité ». C'est la règle qui permet
 * aux courbes de montrer un trou plutôt que d'inventer une ligne droite.
 */
export type Mesure = {
  /** Millisecondes depuis epoch, horloge du téléphone. */
  horodatage: number;
  /** Humidité du sol en pourcentage calibré. */
  humidite: number | null;
  /** Température de l'air en degrés Celsius. */
  temperature: number | null;
  /** Luminosité en pourcentage calibré. */
  lumiere: number | null;
  /** Humidité de l'air en pourcentage, fournie seulement par MQTT. */
  humiditeAir: number | null;
  /** Valeurs brutes du convertisseur, uniquement via le sujet « brut ». */
  brutHumidite?: number | null;
  brutLumiere?: number | null;
  /** Origine de la mesure, utile quand deux sources coexistent. */
  source: SourceDonnees;
};

/** Une mesure vide, pour démarrer un écran sans écrire de null partout. */
export function mesureVide(source: SourceDonnees, horodatage: number): Mesure {
  return {
    horodatage,
    humidite: null,
    temperature: null,
    lumiere: null,
    humiditeAir: null,
    source,
  };
}

// ---------------------------------------------------------------------
//  5. Constantes de calibration et de seuils (contrat, sections 2 et 3)
// ---------------------------------------------------------------------
//  Ces quatre nombres viennent de firmware/src/config.h. Ce sont des
//  valeurs de départ : chaque binôme recalibre son capteur en séance 2,
//  et l'écran Réglages écrase ces valeurs.

export const CALIBRATION_DEFAUT = {
  /** Valeur brute lue capteur à l'air libre. Correspond à 0 %. */
  solSec: 3220,
  /** Valeur brute lue capteur dans un verre d'eau. Correspond à 100 %. */
  solHumide: 980,
  /** Valeur brute lue dans le noir. Correspond à 0 %. */
  lumSombre: 4030,
  /** Valeur brute lue en pleine lumière. Correspond à 100 %. */
  lumClair: 400,
} as const;

export type Calibration = {
  solSec: number;
  solHumide: number;
  lumSombre: number;
  lumClair: number;
};

/** Seuils de confort par défaut (SEUIL_BAS et SEUIL_HAUT du firmware). */
export const SEUILS_DEFAUT = { bas: 30, haut: 70 } as const;

export type Seuils = {
  /** En dessous, la plante a soif. */
  bas: number;
  /** Au dessus, elle a trop bu. */
  haut: number;
};

/** Écart, en points de pourcentage, entre « soif » et « assoiffée ». */
export const MARGE_EXTREME = 15;

/** Période de mesure de la carte, en millisecondes (PERIODE_MESURE_MS). */
export const PERIODE_MESURE_MS = 2000;

/**
 * Au delà de cette durée sans nouvelle mesure, l'application déclare la
 * donnée périmée. Le contrat fixe cinq minutes, section 3.
 * Une valeur affichée sans indication d'âge est un mensonge poli :
 * l'écran doit dire quand il montre une photo ancienne.
 */
export const DUREE_FRAICHEUR_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------
//  6. Fiche d'identité de la plante (contrat, section 3)
// ---------------------------------------------------------------------
//  Le contrat dit que les seuils par défaut sont « surchargés par la
//  fiche d'identité de la plante ». Voici le catalogue du module : trois
//  espèces qui couvrent trois comportements très différents.

export type Espece = {
  id: string;
  nom: string;
  nomLatin: string;
  seuils: Seuils;
  /** Une phrase d'entretien, affichée sur la fiche. */
  entretien: string;
  /** Exposition conseillée, en pourcentage de luminosité visé. */
  lumiereIdeale: Seuils;
};

export const ESPECES: readonly Espece[] = [
  {
    id: 'basilic',
    nom: 'Basilic',
    nomLatin: 'Ocimum basilicum',
    seuils: { bas: 40, haut: 75 },
    entretien: 'Terre jamais sèche, arrosage par le bas, plein soleil le matin.',
    lumiereIdeale: { bas: 55, haut: 90 },
  },
  {
    id: 'pothos',
    nom: 'Pothos',
    nomLatin: 'Epipremnum aureum',
    seuils: { bas: 30, haut: 70 },
    entretien: 'Laisser sécher les trois premiers centimètres entre deux arrosages.',
    lumiereIdeale: { bas: 25, haut: 70 },
  },
  {
    id: 'cactus',
    nom: 'Cactus de Noël',
    nomLatin: 'Schlumbergera truncata',
    seuils: { bas: 15, haut: 45 },
    entretien: "Peu d'eau, jamais de soucoupe pleine, repos sec en hiver.",
    lumiereIdeale: { bas: 40, haut: 80 },
  },
];

/** Espèce utilisée quand la fiche n'a pas encore été renseignée. */
export const ESPECE_DEFAUT = ESPECES[1];

/** Retrouve une espèce par son identifiant, ou l'espèce par défaut. */
export function especeParId(id: string | undefined): Espece {
  if (!id) return ESPECE_DEFAUT;
  return ESPECES.find((e) => e.id === id) ?? ESPECE_DEFAUT;
}

// ---------------------------------------------------------------------
//  7. Décodage des trames Bluetooth (contrat, section 4)
// ---------------------------------------------------------------------
//  react-native-ble-plx rend les valeurs en base64. Le décodage est écrit
//  ici, sans dépendance, pour deux raisons : il se teste sans téléphone,
//  et il documente le format d'encodage à côté des UUID.

const ALPHABET_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Convertit une chaîne base64 en octets.
 * On n'utilise ni Buffer (absent de React Native) ni atob (absent de
 * certains environnements de test) : vingt lignes valent mieux qu'une
 * incompatibilité qui n'apparaît qu'au premier lancement sur téléphone.
 */
export function base64VersOctets(b64: string): Uint8Array {
  const propre = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const octets = new Uint8Array(Math.floor((propre.length * 3) / 4));
  let position = 0;
  let tampon = 0;
  let bits = 0;
  for (const caractere of propre) {
    const valeur = ALPHABET_B64.indexOf(caractere);
    if (valeur < 0) continue;
    tampon = (tampon << 6) | valeur;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      octets[position++] = (tampon >> bits) & 0xff;
    }
  }
  return octets.subarray(0, position);
}

/**
 * Décode un entier 16 bits non signé, petit-boutiste.
 * Petit-boutiste veut dire que l'octet de poids faible arrive en premier :
 * l'ESP32 écrit sa mémoire telle quelle, il n'inverse rien pour nous.
 */
export function decoderUint16LE(octets: Uint8Array): number | null {
  if (octets.length < 2) return null;
  return octets[0] | (octets[1] << 8);
}

/**
 * Décode un entier 16 bits signé, petit-boutiste.
 * La température peut descendre sous zéro : sans ce passage en signé,
 * -3,5 °C s'affiche à 652,35 °C, et la plante a l'air en feu.
 */
export function decoderInt16LE(octets: Uint8Array): number | null {
  const brut = decoderUint16LE(octets);
  if (brut === null) return null;
  return brut >= 0x8000 ? brut - 0x10000 : brut;
}

/**
 * Décode une suite d'octets UTF-8 en texte.
 * La caractéristique de statut transporte du JSON, et ce JSON contient
 * le nom de la plante, donc des accents. Un décodage octet par octet
 * afficherait « Basilic de PaulÃ© » : on gère les séquences multioctets.
 */
export function octetsVersTexteUtf8(octets: Uint8Array): string {
  let texte = '';
  for (let i = 0; i < octets.length; ) {
    const premier = octets[i];
    let pointDeCode: number;
    let longueur: number;
    if (premier < 0x80) {
      pointDeCode = premier;
      longueur = 1;
    } else if (premier >= 0xc0 && premier < 0xe0) {
      pointDeCode = premier & 0x1f;
      longueur = 2;
    } else if (premier >= 0xe0 && premier < 0xf0) {
      pointDeCode = premier & 0x0f;
      longueur = 3;
    } else {
      pointDeCode = premier & 0x07;
      longueur = 4;
    }
    if (i + longueur > octets.length) break;
    for (let j = 1; j < longueur; j += 1) {
      pointDeCode = (pointDeCode << 6) | (octets[i + j] & 0x3f);
    }
    texte += String.fromCodePoint(pointDeCode);
    i += longueur;
  }
  return texte;
}

/**
 * Applique la division par 100 du contrat.
 * La carte multiplie par 100 pour transporter deux décimales dans un
 * entier : pas de flottant sur le fil, pas de question d'endianness
 * flottante, et deux octets au lieu de quatre.
 */
export function centiemesVersReel(centiemes: number | null): number | null {
  return centiemes === null ? null : centiemes / 100;
}
