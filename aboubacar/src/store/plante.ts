// =====================================================================
//  store/plante.ts · l'état partagé par tous les écrans
// =====================================================================
//  Un seul magasin Zustand : un store, un hook, rien de plus. La source
//  de données écrit dedans depuis app/_layout.tsx, les écrans lisent ce
//  dont ils ont besoin.
//
//  POURQUOI UN MAGASIN. Les mesures arrivent une fois, mais l'accueil,
//  la fiche et les réglages les montrent tous les trois. Sans état
//  partagé, chaque écran ouvrirait sa propre connexion, et la carte
//  n'en accepte qu'une en Bluetooth.
//
//  SÉANCE 2 · LE REGROUPEMENT PAR CYCLE. La carte notifie les trois
//  grandeurs séparément en Bluetooth, à quelques dizaines de
//  millisecondes d'intervalle. Une valeur qui arrive moins d'une seconde
//  après la mesure en cours, pour un champ encore vide, complète cette
//  mesure au lieu d'en créer une nouvelle.
//
//  SÉANCE 3 · DEUX SOURCES, UNE SEULE À LA FOIS. Le broker envoie un
//  objet déjà complet : pas de regroupement, une mesure par message.
//  Changer de source vide le tampon, pour ne jamais mélanger une mesure
//  Bluetooth et une mesure MQTT dans le même calcul d'humeur.
// =====================================================================
import { create } from "zustand";

import {
  mesureVide,
  type ChargeMesures,
  type ChargeStatut,
  type Mesure,
} from "../lib/contrat";
import type { ChampBle } from "../lib/ble";
import type { EtatConnexion } from "../lib/lien";

/** Moins d'une seconde d'écart : même cycle de mesure. */
const FENETRE_CYCLE_MS = 1000;

/** Une minute de mesures, largement assez pour l'écran en direct. */
const TAILLE_TAMPON = 30;

export type Source = "ble" | "mqtt";

type EtatPlante = {
  /** D'où viennent les mesures. Une seule source à la fois. */
  source: Source;
  etatConnexion: EtatConnexion;
  /** Le motif affichable : nom de la carte, ou raison du dernier échec. */
  detailConnexion: string | null;
  /** Les mesures reçues, la plus récente en dernier. */
  mesures: Mesure[];
  /** Le dernier statut publié par la carte, retenu par le broker. MQTT seulement. */
  statutPlante: ChargeStatut | null;
  /** Incrémenté à chaque demande de relance, app/_layout.tsx l'observe. */
  tentative: number;

  definirSource: (source: Source) => void;
  definirEtatConnexion: (etat: EtatConnexion, detail?: string) => void;
  /** Bluetooth : une grandeur à la fois. */
  majValeur: (champ: ChampBle, valeur: number) => void;
  /** MQTT : l'objet complet du sujet « mesures ». */
  appliquerMesuresMqtt: (charge: ChargeMesures) => void;
  definirStatut: (statut: ChargeStatut) => void;
  relancer: () => void;
};

/** Un champ absent ou mal nommé reste null, il ne devient jamais zéro. */
function nombre(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null;
}

export const usePlante = create<EtatPlante>()((set) => ({
  source: "mqtt",
  etatConnexion: "inactive",
  detailConnexion: null,
  mesures: [],
  statutPlante: null,
  tentative: 0,

  definirSource(source) {
    set({ source, mesures: [], statutPlante: null });
  },

  definirEtatConnexion(etat, detail) {
    set({ etatConnexion: etat, detailConnexion: detail ?? null });
  },

  majValeur(champ, valeur) {
    const maintenant = Date.now();
    set((etat) => {
      const derniere = etat.mesures[etat.mesures.length - 1];
      const memeCycle =
        derniere !== undefined &&
        maintenant - derniere.horodatage < FENETRE_CYCLE_MS &&
        derniere[champ] === null;

      if (memeCycle) {
        return {
          mesures: [
            ...etat.mesures.slice(0, -1),
            { ...derniere, [champ]: valeur },
          ],
        };
      }
      const neuve: Mesure = {
        ...mesureVide("ble", maintenant),
        [champ]: valeur,
      };
      return { mesures: [...etat.mesures, neuve].slice(-TAILLE_TAMPON) };
    });
  },

  appliquerMesuresMqtt(charge) {
    const neuve: Mesure = {
      ...mesureVide("mqtt", Date.now()),
      humidite: nombre(charge.humidite),
      temperature: nombre(charge.temperature),
      lumiere: nombre(charge.lumiere),
      humiditeAir: nombre(charge.humidite_air),
    };
    set((etat) => ({
      mesures: [...etat.mesures, neuve].slice(-TAILLE_TAMPON),
    }));
  },

  definirStatut(statut) {
    set({ statutPlante: statut });
  },

  relancer() {
    set((etat) => ({ tentative: etat.tentative + 1 }));
  },
}));
