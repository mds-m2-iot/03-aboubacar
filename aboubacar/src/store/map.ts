// =====================================================================
//  store/map.ts · la carte des plantes de la promo
// =====================================================================
//  Séance 6. Les lieux arrivent du sujet « lieu » (retenu), les humeurs
//  du sujet « mesures » de chaque plante. L'écran de carte dit au client
//  quand il est ouvert : on n'écoute les mesures de toute la promo que
//  pendant qu'on regarde la carte.
// =====================================================================
import { create } from 'zustand';

import { mesureVide, type ChargeLieu, type ChargeMesures, type Mesure } from '../lib/contrat';

type MapState = {
  places: Record<string, ChargeLieu>;
  measures: Record<string, Mesure>;
  /** true pendant que l'écran de carte est affiché. */
  watching: boolean;
  /** Publie (ou efface avec null) le lieu de TA plante. Branché par _layout.tsx. */
  publishPlace: ((place: ChargeLieu | null) => boolean) | null;
  setWatching: (watching: boolean) => void;
  setPublishPlace: (publish: ((place: ChargeLieu | null) => boolean) | null) => void;
  applyPlace: (id: string, place: ChargeLieu | null) => void;
  applyMeasure: (id: string, charge: ChargeMesures) => void;
};

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const useMap = create<MapState>()((set) => ({
  places: {},
  measures: {},
  watching: false,
  publishPlace: null,

  setWatching(watching) {
    set({ watching });
  },

  setPublishPlace(publish) {
    set({ publishPlace: publish });
  },

  applyPlace(id, place) {
    set((state) => {
      const places = { ...state.places };
      if (place) places[id] = place;
      else delete places[id];
      return { places };
    });
  },

  applyMeasure(id, charge) {
    const measure: Mesure = {
      ...mesureVide('mqtt', Date.now()),
      humidite: toNumber(charge.humidite),
      temperature: toNumber(charge.temperature),
      lumiere: toNumber(charge.lumiere),
      humiditeAir: toNumber(charge.humidite_air),
    };
    set((state) => ({ measures: { ...state.measures, [id]: measure } }));
  },
}));
