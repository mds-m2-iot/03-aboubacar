# Aide TypeScript · épreuve individuelle

Fiche de révision pour l'oral du 19 novembre : tous les éléments de langage utilisés dans `diagnostic.ts` et `serie.ts`, avec un mini-exemple et la phrase à dire.

---

## 1. Variables

### `const` et `let`

```ts
const HEURE_LEVER = 9;   // ne change jamais
let heuresVides = 0;     // peut changer
heuresVides = 3;         // ✅ autorisé avec let
heuresVides++;           // ✅ ajoute 1 → 4
```

- **`const`** par défaut.
- **`let`** seulement si la variable doit changer (compteurs, variable de boucle).
- `const` sur un tableau interdit de le **remplacer**, pas d'**ajouter dedans** : `points.push(x)` marche.

> À l'oral : « `let`, c'est une variable modifiable. Je l'utilise pour les compteurs qui changent dans la boucle. »

---

## 2. Types

| Écriture | Signification | Exemple |
|---|---|---|
| `: number` | un nombre | `const age: number = 20;` |
| `: string` | un texte | `const nom: string = 'Abou';` |
| `: boolean` | vrai ou faux | `const deJour: boolean = true;` |
| `Type[]` | un tableau de ce type | `const notes: number[] = [12, 15];` |
| `readonly Type[]` | tableau non modifiable | `readonly Grandeur[]` |
| `A \| B` | A **ou** B | `Mesure \| null` |
| `null` | « rien », valeur absente | `humidite: null` |
| `unknown` | « on ne sait pas encore » : on doit vérifier avant de s'en servir | `valeur: unknown` |

### `import` et `import type`

```ts
import { calculerHumeur } from './humeur';        // une fonction
import { type Mesure } from './contrat';          // seulement un type
```

`type` devant le nom : il ne sert qu'à TypeScript, il disparaît à l'exécution.

---

## 3. Fonctions

```ts
export function diagnostiquer(mesure: Mesure | null, maintenant: number): Diagnostic {
  // ...
  return resultat;
}
```

| Élément | Rôle |
|---|---|
| `export` | d'autres fichiers peuvent l'importer |
| `(a: Type, b: Type)` | les paramètres et leurs types |
| `): TypeRendu {` | le type de ce que la fonction rend |
| `return x;` | rend `x` et **sort immédiatement** de la fonction |

**Fonction sans `export`** (`valeurPropre`, `caseVide`) : une aide qui ne sert que dans ce fichier, pour ne pas répéter le même code.

### Fonction fléchée

```ts
(n) => n * 2          // prend n, rend n × 2
(a, b) => a - b       // prend a et b, rend a − b
```

Une petite fonction sans nom, écrite en une ligne. On la donne à `filter` et `sort`.

---

## 4. Comparaisons et conditions

| Écriture | Signification |
|---|---|
| `===` | est égal à |
| `!==` | est différent de |
| `<` `>` | strictement inférieur / supérieur |
| `<=` `>=` | inférieur ou égal / supérieur ou égal |
| `\|\|` | **ou** : vrai si au moins un est vrai |
| `&&` | **et** : vrai si les deux sont vrais |
| `!x` | **non** : inverse vrai/faux |

```ts
if (a || b) { ... }
else if (c) { ... }
else { ... }
```

### Ternaire : un if/else en une ligne

```ts
problemes.length > 0 ? 'soucis' : 'ok'
// s'il y a des problèmes → 'soucis', sinon → 'ok'
```

### `??` : valeur par défaut

```ts
parHeure.get(debut) ?? caseVide(debut)
// le point de cette heure s'il existe, sinon une case vide
```

### `typeof` et `Number.isFinite`

```ts
typeof valeur !== 'number'     // valeur n'est pas un nombre ("0" est du texte !)
Number.isFinite(valeur)        // vrai nombre : ni NaN, ni l'infini
```

---

## 5. Objets

```ts
{ etat: 'inconnu', problemes: [] }     // un objet = valeurs nommées
{ nonVerifie }                         // raccourci de { nonVerifie: nonVerifie }
```

### Lire un champ

```ts
mesure.humidite        // nom écrit en dur
mesure['humidite']     // même chose
mesure[grandeur]       // le nom est dans la variable grandeur
```

---

## 6. Tableaux

| Méthode | Rôle | Exemple |
|---|---|---|
| `.length` | nombre d'éléments | `[1, 2, 3].length` → `3` |
| `.push(x)` | ajoute `x` à la fin | `t.push('froid')` |
| `.indexOf(x)` | position de `x` (à partir de 0) | `['a','b','c'].indexOf('c')` → `2` |
| `[...t]` | copie du tableau | `[...GRANDEURS]` |
| `.filter(f)` | garde les éléments où `f` rend `true` | voir ci-dessous |
| `.sort(f)` | trie selon `f` | voir ci-dessous |

### `filter` pas à pas

```ts
GRANDEURS.filter((grandeur) => mesure[grandeur] === null)
```

| `grandeur` | `mesure[grandeur]` | `=== null` ? | gardée ? |
|---|---|---|---|
| `'humidite'` | 30 | false | non |
| `'temperature'` | null | **true** | **oui** |
| `'lumiere'` | 60 | false | non |

Résultat : `['temperature']`.

> À l'oral : « `filter` parcourt les 3 grandeurs et ne garde que celles qui valent `null` dans la mesure. »

### `sort` pas à pas

```ts
problemes.sort((a, b) => ORDRE_URGENCE.indexOf(a) - ORDRE_URGENCE.indexOf(b))
```

- résultat **négatif** → `a` avant `b`
- résultat **positif** → `b` avant `a`

`reput` (place 5) contre `froid` (place 2) : 5 − 2 = 3, positif → `froid` passe devant.

> À l'oral : « on trie selon la place de chaque problème dans la liste d'urgence. »

---

## 7. Boucles

### `for...of` : pour chaque élément

```ts
for (const point of brut) {
  // point vaut chaque élément du tableau, un par un
}
```

### `for` classique : avec un compteur

```ts
for (let debut = premiere; debut <= derniere; debut += UNE_HEURE_MS) {
  // départ ; condition pour continuer ; ce qu'on ajoute à chaque tour
}
```

### `continue`

Passe **immédiatement au tour suivant** de la boucle (on ignore la suite pour cet élément).

---

## 8. Map : le dictionnaire

```ts
const m = new Map<number, PointHoraire>();   // clé = nombre, valeur = point
m.set(cle, valeur);    // range (ÉCRASE si la clé existe déjà)
m.get(cle);            // relit (undefined si absente)
m.size;                // nombre de clés
[...m.keys()];         // tableau de toutes les clés
```

> À l'oral : « `set` écrase l'ancien point de la même heure, donc le dernier du tableau l'emporte. »

---

## 9. Maths et dates

| Écriture | Rôle | Exemple |
|---|---|---|
| `Math.floor(x)` | arrondi à l'entier inférieur | `Math.floor(14.6)` → `14` |
| `Math.min(...t)` | plus petite valeur du tableau | |
| `Math.max(...t)` | plus grande valeur du tableau | |
| `new Date(ms)` | une date à partir de millisecondes | |
| `.getHours()` | heure **locale** du téléphone, 0 à 23 | |

### Arrondir à l'heure

```ts
Math.floor(point.debut / UNE_HEURE_MS) * UNE_HEURE_MS
// 14 h 37 → ÷ 1 h = 14,6 → floor = 14 → × 1 h = 14 h 00
```

---

## 10. Les fonctions de l'épreuve, en une phrase

| Fonction | Fichier | Ce qu'elle fait |
|---|---|---|
| `diagnostiquer` | `diagnostic.ts` | Regarde humidité, température et lumière, et rend les problèmes du plus urgent au moins urgent. |
| `nettoyerSerie` | `serie.ts` | Nettoie les mesures horaires : une case par heure, les trous de 3 h ou plus, la couverture. |

### Modifications probables à l'oral

| Demande | Ce qu'on change |
|---|---|
| « Lumière vérifiée jusqu'à 20 h » | `HEURE_COUCHER = 20` |
| « 5 min pile = périmé » | `>` devient `>=` dans la règle 1 |
| « Un trou dès 2 heures » | `TROU_MIN_HEURES = 2` |
| « Température valide de -30 à 70 » | `valeurPropre(point.temperature, -30, 70)` |
| « Pile sur une borne = froid » | `<` devient `<=` |
