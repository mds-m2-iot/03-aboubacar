// =====================================================================
//  lib/personality.ts · le caractère de la plante
// =====================================================================
//  Séance 6, « La personnalité de la plante ».
//
//  L'humeur dit COMMENT va la plante. Le caractère dit COMMENT ELLE LE
//  DIT. La même soif s'annonce gaiement, en ronchonnant ou en tragédie,
//  selon le caractère choisi dans les réglages. Et la plante sait
//  l'heure qu'il est : on ne dit pas bonjour à 23 h.
//
//  Tout ce fichier est fait de fonctions pures et de textes : il se
//  teste sans téléphone, et c'est ici que tu mets TA voix.
// =====================================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EtatHumeur, Humeur } from './humeur';

export type Trait = 'cheerful' | 'grumpy' | 'dramatic';
export type Moment = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Le moment de la journée, à l'heure LOCALE du téléphone.
 * 6 h à midi le matin, midi à 18 h l'après-midi, 18 h à 23 h le soir,
 * la nuit sinon. Les bornes basses sont incluses.
 */
export function momentOfDay(time: number): Moment {
  const hour = new Date(time).getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

type TraitText = {
  /** Le nom affiché dans les réglages. */
  label: string;
  /** Une phrase d'accueil par moment de la journée. */
  greetings: Record<Moment, string>;
  /** Ce qu'elle répond quand on la touche, plusieurs phrases par humeur. */
  touch: Record<Humeur | 'other', string[]>;
};

/**
 * Les trois caractères. Ces phrases sont des EXEMPLES : en TP, chacun
 * écrit les siennes. Une humeur sans phrase retombe sur « other ».
 */
export const TRAITS: Record<Trait, TraitText> = {
  cheerful: {
    label: 'Joyeuse',
    greetings: {
      morning: 'Bonjour ! Le soleil est levé, moi aussi.',
      afternoon: 'Belle après-midi, non ?',
      evening: 'Bonsoir ! Raconte-moi ta journée.',
      night: 'Chut… je fais de la photosynthèse en rêve.',
    },
    touch: {
      assoiffee: ["De l'eau, s'il te plaît, et vite !", 'Je fane, mais je garde le sourire.'],
      soif: ['Un petit verre ne serait pas de refus.', 'Tu penses à moi ? Moi, je pense à l’arrosoir.'],
      heureuse: ['Hihi, ça chatouille !', 'Encore !', 'Tu as la main verte, tu sais ?'],
      reput: ['Merci, j’ai bien bu !', 'Je suis pleine comme une gourde.'],
      noyee: ['Je nage, là. Une pause, peut-être ?'],
      other: ['Coucou !'],
    },
  },
  grumpy: {
    label: 'Ronchon',
    greetings: {
      morning: 'Déjà ? Laisse-moi encore cinq minutes.',
      afternoon: 'Quoi encore ?',
      evening: 'Enfin le calme. Ne gâche pas tout.',
      night: 'Il est tard. Éteins cette lumière.',
    },
    touch: {
      assoiffee: ['Tu attends que je devienne du foin ?', 'De l’eau. Maintenant.'],
      soif: ['J’ai soif, et je te le dis une fois.', 'Tu as oublié quelque chose, non ?'],
      heureuse: ['Bon. Ça va. Ne t’habitue pas.', 'Arrête de me tripoter.'],
      reput: ['C’est bon, j’ai bu. Merci quand même.'],
      noyee: ['Tu veux faire une rizière ?', 'Trop d’eau. Bravo.'],
      other: ['Hmpf.'],
    },
  },
  dramatic: {
    label: 'Tragédienne',
    greetings: {
      morning: 'Ô aube nouvelle, vais-je survivre à ce jour ?',
      afternoon: 'L’après-midi s’étire, comme mon attente.',
      evening: 'Le soir tombe… et toi, tu viens enfin.',
      night: 'La nuit est noire, comme mon terreau.',
    },
    touch: {
      assoiffee: ['Je me meurs ! Adieu, monde cruel !', 'Souviens-toi de moi quand je serai paille.'],
      soif: ['Le désert gagne mes racines…', 'Une goutte, une seule, par pitié.'],
      heureuse: ['Ce contact… je renais !', 'Le bonheur existe, il est dans ce pot.'],
      reput: ['Désaltérée, je pardonne tout.'],
      noyee: ['Je sombre ! Le déluge est sur moi !'],
      other: ['Ah… te voilà.'],
    },
  },
};

export function greeting(trait: Trait, moment: Moment): string {
  return TRAITS[trait].greetings[moment];
}

/**
 * La réponse au toucher. counter tourne à chaque touche : on parcourt les
 * phrases dans l'ordre, sans hasard, pour que ce soit testable et que
 * deux touches de suite ne répètent pas la même phrase.
 */
export function touchLine(trait: Trait, mood: EtatHumeur, counter: number): string {
  const lines = TRAITS[trait].touch;
  const pool = mood in lines ? lines[mood as Humeur] : lines.other;
  const list = pool.length > 0 ? pool : lines.other;
  return list[((counter % list.length) + list.length) % list.length];
}

/**
 * Une vibration par humeur, en millisecondes : attente, vibre, attente,
 * vibre… Courte et légère quand tout va bien, insistante quand elle a
 * soif. Vibration de React Native, aucun module à installer.
 */
export const VIBRATIONS: Record<EtatHumeur, number[]> = {
  heureuse: [0, 30],
  reput: [0, 30, 80, 30],
  soif: [0, 80, 120, 80],
  assoiffee: [0, 200, 100, 200, 100, 200],
  noyee: [0, 60, 60, 60, 60, 60],
  inconnue: [0, 20],
  perimee: [0, 20],
};

const TRAIT_KEY = 'plant.trait';

export async function loadTrait(): Promise<Trait> {
  try {
    const raw = await AsyncStorage.getItem(TRAIT_KEY);
    return raw === 'cheerful' || raw === 'grumpy' || raw === 'dramatic' ? raw : 'cheerful';
  } catch {
    return 'cheerful';
  }
}

export async function saveTrait(trait: Trait): Promise<void> {
  try {
    await AsyncStorage.setItem(TRAIT_KEY, trait);
  } catch {
    // Pas de disque : le caractère reste choisi jusqu'à la fermeture.
  }
}
