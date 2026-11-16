// =====================================================================
//  lib/plants.ts · la liste de mes plantes
// =====================================================================
//  Séance 6, « Plusieurs plantes ».
//
//  Jusqu'ici, l'application connaissait UNE plante, écrite dans le .env.
//  Chez toi, tu en auras peut-être deux, ou tu voudras suivre celle d'un
//  ami. Une plante suivie, c'est un identifiant (celui de sa carte,
//  binome-XX) et un petit nom. La liste vit sur le téléphone : ajouter
//  une plante ne demande ni de toucher au code, ni de recharger.
//
//  Fonctions pures d'abord, disque ensuite : tout ce qui décide se teste
//  sans téléphone.
// =====================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlantRef = {
  /** L'identifiant de la carte, celui des sujets MQTT : binome-07. */
  id: string;
  /** Le petit nom affiché dans la liste. */
  name: string;
  addedAt: number;
};

/** Les mêmes caractères que ceux que le collecteur accepte (contrat, section 5). */
const PLANT_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,32}$/;

export function isValidPlantId(id: string): boolean {
  return PLANT_ID_PATTERN.test(id);
}

/**
 * Découpe un sujet « plante/<id>/<suffixe> ». null pour tout le reste.
 * C'est ce qui permet à UN client d'écouter plusieurs plantes et de
 * savoir, pour chaque message, de laquelle il parle.
 */
export function parsePlantTopic(topic: string): { id: string; suffix: string } | null {
  const parts = topic.split('/');
  if (parts.length !== 3 || parts[0] !== 'plante' || !isValidPlantId(parts[1])) return null;
  return { id: parts[1], suffix: parts[2] };
}

/**
 * Ajoute une plante, sans doublon, sans modifier la liste reçue.
 * Rend la liste telle quelle si l'identifiant est invalide ou déjà suivi.
 */
export function addPlant(list: readonly PlantRef[], id: string, name: string, now: number): PlantRef[] {
  const cleanId = id.trim();
  if (!isValidPlantId(cleanId) || list.some((p) => p.id === cleanId)) return [...list];
  const cleanName = name.trim() || cleanId;
  return [...list, { id: cleanId, name: cleanName, addedAt: now }];
}

export function removePlant(list: readonly PlantRef[], id: string): PlantRef[] {
  return list.filter((p) => p.id !== id);
}

const PLANTS_KEY = 'plant.followed';

export async function loadPlants(): Promise<PlantRef[]> {
  try {
    const raw = await AsyncStorage.getItem(PLANTS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PlantRef =>
        typeof p === 'object' && p !== null && typeof p.id === 'string' && isValidPlantId(p.id),
    );
  } catch {
    return [];
  }
}

export async function savePlants(list: readonly PlantRef[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(list));
  } catch {
    // Disque indisponible : la liste tient jusqu'à la fermeture.
  }
}
