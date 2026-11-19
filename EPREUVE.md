# Épreuve individuelle · Jules · binôme 03 · ABOU (Passiflora caerulea)

## Les fonctions

| Fonction                              | Ce qu'elle fait                                                                                                                 | Le cas limite le plus délicat                                                                                                      | Comment je l'ai vérifiée                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagnostiquer` (`lib/diagnostic.ts`) | Regarde humidité, température et lumière d'une mesure récente, et rend les problèmes du plus urgent au moins urgent.            | Une mesure de **5 minutes pile** est encore fraîche : la comparaison est `>` et pas `>=` sur `DUREE_FRAICHEUR_MS`.                 | Les 5 exemples du sujet (dont mardi 14 h → assoiffee, chaud, sombre ; 23 h → ok, lumière non vérifiée ; 6 min → inconnu), plus 5 min pile.                       |
| `nettoyerSerie` (`lib/serie.ts`)      | Remet les mesures brutes en une case par heure, valeurs absurdes à `null`, et repère les trous de 3 h ou plus et la couverture. | Un **trou en fin de série** : la boucle ne le ferme qu'en rencontrant une heure mesurée, il faut donc le refermer après la boucle. | Semaine d'exemple : 168 cases, couverture 0,93, trous mercredi 1 h–8 h (7 h) et samedi 14 h–17 h (3 h). Tableau d'entrée non modifié, entrée vide → tout à zéro. |
| `bilanParJour` (`lib/bilan.ts`)       | Résume la série jour par jour : heures mesurées, min, max, moyenne, heures hors confort, arrosages.                             | Un **arrosage après un trou** ne compte pas : l'heure juste avant doit être connue (`points[i - 1].humidite !== null`).            | Semaine d'exemple, seuils 35/70 : 29/09 → 24 h, 30,2–71,8, moyenne 44,6, 10 h hors confort, 1 arrosage ; 30/09 → 17 h, incomplet. Entrée vide → `[]`.            |
| `versCsv` (`lib/export.ts`)           | Transforme le bilan en texte CSV pour Excel : en-tête, une ligne par jour, `;`, virgule décimale, `\r\n`.                       | Les **nombres** : une décimale au plus, arrondie, virgule (50 → `50`, 61,2345 → `61,2`) et case vide pour `null`.                  | Ligne du 29/09 identique au sujet (`2026-09-29;24;oui;30,2;71,8;44,6;10;1`), liste vide → en-tête seul, jour sans mesure → `;;;`.                                |

## Mon option : B, exporter la semaine

Je l'ai choisie parce qu'elle est **simple à expliquer** : une seule fonction, sans calcul piégeux, que je peux modifier en direct (séparateur, nombre de décimales, oui/non).

## Ce que j'ai demandé à l'IA (Claude, dans Claude Code)

- **M'expliquer les règles** de chaque imposée et **la syntaxe TypeScript** que je ne connaissais pas (`filter`, `sort`, `Map`, `reduce`, `padStart`, `Record`, `async/await`…). J'en ai fait une fiche, `AIDE-TYPESCRIPT.md`.
- **Me proposer le code** de chaque fonction et de chaque écran. Je l'ai **tapé moi-même** pour le comprendre ligne par ligne.
- **Relire et tester** ce que j'avais tapé sur la semaine d'exemple. Elle a trouvé mes erreurs de frappe et je les ai corrigées : mauvais import (`./calculs`), noms mal écrits (`calculerhumeur`, `lenght`, `fucntion`, `versCSV` au lieu de `versCsv`), `<=` au lieu de `<` pour 18 h, bornes fausses dans `valeurPropre`, `points[i - 1]` sans `.humidite`.
- M'aider avec l'environnement : iCloud qui avait cassé git et `node_modules`, la compilation iOS sur mon iPhone, et la barre d'onglets qui cachait le bouton.

**Ce que j'ai corrigé derrière elle :**

- Le texte du bouton : il doit être exactement « Partager la semaine ».
- Les besoins en température et en lumière : l'IA a d'abord proposé des chiffres sans source (10–30 °C). Je lui ai demandé une source, et j'ai retenu 10–27 °C (idéal 18–27 °C, jamais sous 10 °C) et 40 % de lumière (lumière vive, mi-ombre tolérée). La source datée est dans `source`, dans `lib/fiche.ts`. La lumière en % est ma conversion de « lumière vive » pour notre capteur.
- Les phrases de la plante, que j'ai réécrites avec mes mots.

## Où voir chaque fonctionnalité

| Fonctionnalité                  | Écran                                                             | Geste                                                    |
| ------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| Diagnostic (imposée 1)          | **Accueil**, carte « Son diagnostic » sous l'humeur               | Ouvrir l'app ; sans carte connectée → phrase « inconnu » |
| Trous et couverture (imposée 2) | **Historique**, carte « Ce qui manque » sous la courbe            | Ouvrir l'onglet Historique                               |
| Sa semaine (imposée 3)          | **Historique**, section « Sa semaine », jours incomplets signalés | Faire défiler sous la courbe                             |
| Export CSV (option B)           | **Historique**, bouton « Partager la semaine »                    | Toucher le bouton → Mail, Notes, Fichiers…               |

Les écrans de l'historique utilisent la **semaine d'exemple** du kit, comme le sujet l'autorise.
