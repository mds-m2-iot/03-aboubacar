// =====================================================================
//  lib/serie.ts · imposée 2, une série propre
// =====================================================================
//  Nettoie les mesures horaires brutes : une case par heure, les trous
//  de 3 h ou plus, et la part des heures mesurées (couverture).
// =====================================================================
import type { PointHoraire, SerieNettoyee, Trou } from './types-epreuve';

const UNE_HEURE_MS = 60 * 60 * 1000; // 1 h en millisecondes
const TROU_MIN_HEURES = 3; // un trou = au moins 3 h vides d'affilée

// Rend la valeur si c'est un vrai nombre dans les bornes, sinon null (règle 3).
function valeurPropre(valeur: unknown, min: number, max: number): number | null {
  if (typeof valeur !== 'number' || !Number.isFinite(valeur)) return null;
  if (valeur < min || valeur > max) return null;
  return valeur;
}

// Une heure sans mesure : les trois valeurs à null (règle 5).
function caseVide(debut: number): PointHoraire {
  return { debut, humidite: null, temperature: null, lumiere: null };
}

// nettoyerSerie : transforme les mesures brutes en une série propre.
// Une case par heure (vide si rien), valeurs absurdes à null, liste des
// trous de 3 h ou plus, et couverture (part des heures avec humidité).
export function nettoyerSerie(brut: readonly PointHoraire[], maintenant: number): SerieNettoyee {
  // Dictionnaire heure → point : une seule entrée par heure.
  const parHeure = new Map<number, PointHoraire>();

  for (const point of brut) {
    // Règle 1 : debut illisible ou dans le futur → on ignore ce point.
    if (typeof point.debut !== 'number' || !Number.isFinite(point.debut)) continue;
    if (point.debut > maintenant) continue;

    // Règle 2 : ramené au début de l'heure (14 h 37 → 14 h 00).
    const debut = Math.floor(point.debut / UNE_HEURE_MS) * UNE_HEURE_MS;

    // Règle 4 : set écrase la même heure → le dernier point gagne.
    // Nouvel objet : le tableau reçu n'est pas modifié (règle 8).
    parHeure.set(debut, {
      debut,
      humidite: valeurPropre(point.humidite, 0, 100),
      temperature: valeurPropre(point.temperature, -20, 60),
      lumiere: valeurPropre(point.lumiere, 0, 100),
    });
  }

  // Règle 7 : rien de valable → tout vide.
  if (parHeure.size === 0) return { points: [], trous: [], couverture: 0 };

  // Règle 5 : une case par heure, de la première à la dernière.
  const heures = [...parHeure.keys()];
  const premiere = Math.min(...heures);
  const derniere = Math.max(...heures);

  const points: PointHoraire[] = [];
  for (let debut = premiere; debut <= derniere; debut += UNE_HEURE_MS) {
    points.push(parHeure.get(debut) ?? caseVide(debut)); // heure absente → case vide
  }

  // Règle 6 : on compte les heures sans humidité d'affilée.
  const trous: Trou[] = [];
  let debutTrou: number | null = null; // null = pas dans un trou
  let heuresVides = 0;

  for (const point of points) {
    if (point.humidite === null) {
      if (debutTrou === null) debutTrou = point.debut; // le trou commence
      heuresVides++;
    } else {
      // Le trou se termine : on le garde s'il dure 3 h ou plus.
      if (debutTrou !== null && heuresVides >= TROU_MIN_HEURES) {
        trous.push({ debut: debutTrou, fin: point.debut, heures: heuresVides });
      }
      debutTrou = null;
      heuresVides = 0;
    }
  }

  // Si la série finit dans un trou, on le ferme quand même.
  if (debutTrou !== null && heuresVides >= TROU_MIN_HEURES) {
    trous.push({ debut: debutTrou, fin: debutTrou + heuresVides * UNE_HEURE_MS, heures: heuresVides });
  }

  // Règle 7 : couverture = cases avec humidité connue / toutes les cases.
  const connues = points.filter((point) => point.humidite !== null).length;
  return { points, trous, couverture: connues / points.length };
}
