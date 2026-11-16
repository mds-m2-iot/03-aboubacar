// =====================================================================
//  store/plants.ts · les plantes suivies et leur dernière mesure
// =====================================================================
//  Séance 6. Un deuxième magasin, à côté de celui de TA plante : il ne
//  touche pas au regroupement Bluetooth ni à l'humeur de l'accueil, qui
//  continuent de marcher exactement comme avant.
//
//  Pour chaque plante suivie, on ne garde que la DERNIÈRE mesure reçue :
//  la liste montre un état, pas une courbe. La courbe, c'est la base qui
//  la donne, sur la fiche de la plante.
// =====================================================================
import { create } from 'zustand';

import { mesureVide, type ChargeMesures, type Mesure } from '../lib/contrat';
import { addPlant, removePlant, savePlants, type PlantRef } from '../lib/plants';

type PlantsState = {
  plants: PlantRef[];
  /** Dernière mesure par identifiant de plante. */
  latest: Record<string, Mesure>;
  setPlants: (plants: PlantRef[]) => void;
  add: (id: string, name: string) => void;
  remove: (id: string) => void;
  applyMeasure: (id: string, charge: ChargeMesures) => void;
};

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const usePlants = create<PlantsState>()((set, get) => ({
  plants: [],
  latest: {},

  setPlants(plants) {
    set({ plants });
  },

  add(id, name) {
    const plants = addPlant(get().plants, id, name, Date.now());
    set({ plants });
    void savePlants(plants);
  },

  remove(id) {
    const plants = removePlant(get().plants, id);
    const latest = { ...get().latest };
    delete latest[id];
    set({ plants, latest });
    void savePlants(plants);
  },

  applyMeasure(id, charge) {
    // Une plante qu'on ne suit plus peut encore envoyer un message, le
    // temps que le désabonnement arrive au broker : on l'ignore.
    if (!get().plants.some((p) => p.id === id)) return;
    const measure: Mesure = {
      ...mesureVide('mqtt', Date.now()),
      humidite: toNumber(charge.humidite),
      temperature: toNumber(charge.temperature),
      lumiere: toNumber(charge.lumiere),
      humiditeAir: toNumber(charge.humidite_air),
    };
    set((state) => ({ latest: { ...state.latest, [id]: measure } }));
  },
}));
