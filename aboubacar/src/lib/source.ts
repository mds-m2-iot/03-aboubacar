// =====================================================================
//  lib/source.ts · la source choisie, gardée sur le téléphone
// =====================================================================
//  Séance 6. Les plantes suivies et la carte passent par le broker. Si
//  l'application repartait en Bluetooth à chaque lancement, la liste se
//  tairait à la première réouverture. La source choisie dans les
//  réglages est donc écrite sur le disque, comme le caractère.
// =====================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Source } from '../store/plante';

const SOURCE_KEY = 'plant.source';

export async function loadSource(): Promise<Source | null> {
  try {
    const raw = await AsyncStorage.getItem(SOURCE_KEY);
    return raw === 'ble' || raw === 'mqtt' ? raw : null;
  } catch {
    return null;
  }
}

export async function saveSource(source: Source): Promise<void> {
  try {
    await AsyncStorage.setItem(SOURCE_KEY, source);
  } catch {
    // Disque indisponible : la source tient jusqu'à la fermeture.
  }
}
