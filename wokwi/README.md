# Simuler la plante dans le navigateur

Ce dossier sert à l'éditeur en ligne de **wokwi.com**, qui fait tourner un
ESP32 dans un onglet, capteurs compris, sans rien installer. C'est l'outil
à connaître pour tester une idée en cinq minutes, chez toi ou dans le
train.

Pour la voie principale du module, celle qui fait tourner le firmware de
référence sur ton poste et sans file d'attente, va plutôt voir
`../simulation/`. Les deux méthodes sont utiles, elles ne servent pas au
même moment.

## Ce que Wokwi sait faire, et ce qu'il ne sait pas

| | Simulé |
|---|---|
| WiFi, MQTT sortant | oui |
| Entrées analogiques, I2C, écran SSD1306 | oui |
| DHT22, photorésistance, potentiomètre | oui |
| **Bluetooth Low Energy** | **non, jamais** |

La documentation de Wokwi marque le Bluetooth comme non implémenté sur
toute la famille ESP32. La séance 2 se fait donc sur le vrai matériel et
ne se rattrape pas en simulation. En revanche, si ta carte tombe en panne
un jour de séance 3, le projet `s3-mqtt` te permet de continuer.

## Les deux projets

**`s1-capteurs`**, pour la séance 1. Les trois capteurs et l'écran, câblés
exactement comme le kit réel : humidité du sol sur GPIO34, lumière sur
GPIO35, DHT22 sur GPIO25, écran sur GPIO21 et GPIO22.

**`s3-mqtt`**, pour la séance 3. Le même schéma, plus le WiFi et la
publication MQTT. Le point d'accès `Wokwi-GUEST` n'existe que dans le
simulateur. Le broker, lui, est celui du module, en TLS et avec le compte
de la classe : ta plante simulée apparaît sur le mur comme une vraie.
Deux choses à faire avant de lancer : **coller le mot de passe de la
classe** dans `MQTT_MOTDEPASSE`, laissé vide dans le dépôt, et **changer
le préfixe de sujet**, sinon ton projet et celui du binôme d'à côté se
mélangent sans qu'aucune erreur ne s'affiche.

Sujets publiés, identiques à ceux du kit réel :

```
plante/<id>/humidite      nombre, %
plante/<id>/temperature   nombre, °C
plante/<id>/lumiere       nombre, %
plante/<id>/mesures       objet JSON complet
plante/<id>/statut        objet JSON, message retenu
plante/<id>/cmd           commandes reçues
```

Chaque dossier contient les trois fichiers qu'attend l'éditeur web :
`diagram.json`, `sketch.ino` et `libraries.txt`.

## Recopier un projet dans l'éditeur

Compter dix minutes la première fois, trois ensuite.

### Avant de commencer

Il faut un **compte wokwi.com**, gratuit. Sans compte, rien ne se
sauvegarde et rien ne se partage : le projet vit le temps de l'onglet.
C'est le premier piège, et il coûte le travail entier de la manipulation.

### Les huit étapes

1. Ouvrir **wokwi.com/projects/new/esp32**. On obtient un projet vide,
   avec un `sketch.ino` qui fait clignoter une LED et un `diagram.json`
   qui ne contient que la carte.
2. Renommer le projet en cliquant sur son titre, en haut à gauche :
   « Plante connectée · capteurs (S1) » ou « … · MQTT (S3) ». Un projet
   nommé `Untitled` est introuvable trois semaines plus tard.
3. Onglet **`sketch.ino`** : tout sélectionner avec Ctrl+A, puis coller le
   contenu du fichier `sketch.ino` du dossier correspondant.
4. Ouvrir l'onglet **Library Manager**, cliquer sur le bouton **+**, et
   ajouter une bibliothèque, n'importe laquelle. C'est cette manipulation
   qui **crée** le fichier `libraries.txt` : tant qu'aucune bibliothèque
   n'a été ajoutée, l'onglet du fichier n'existe pas, et on ne peut donc
   pas y coller quoi que ce soit.
5. Ouvrir `libraries.txt` et y coller le contenu du fichier du dossier,
   commentaires compris. On a alors exactement les mêmes bibliothèques que
   le dépôt, sans avoir eu à les choisir une par une.
6. Onglet **`diagram.json`** : Ctrl+A, puis coller le contenu du dossier.
   Le schéma se redessine immédiatement. S'il ne se redessine pas, le JSON
   est mal collé, et Wokwi affiche l'erreur en rouge sous l'éditeur.
7. **Ctrl+S** pour sauvegarder. Avant de lancer, pas après.
8. Bouton **vert de lecture** pour démarrer la simulation.

### Les bibliothèques

Pour `s1-capteurs` :

```
DHT sensor library
Adafruit Unified Sensor
Adafruit SSD1306
Adafruit GFX Library
```

Pour `s3-mqtt`, les quatre précédentes plus :

```
PubSubClient
ArduinoJson
```

Ne pas s'étonner de voir la liste grandir toute seule : Wokwi ajoute les
dépendances déclarées par chaque bibliothèque. Ajouter `DHT sensor
library` fait apparaître d'autres lignes Adafruit sans qu'on les ait
demandées. Coller le fichier du dépôt par-dessus reste la bonne manœuvre,
il les contient déjà toutes.

### Le piège des homonymes

C'est un classique de l'écosystème Arduino, et il ne concerne pas que
Wokwi : plusieurs auteurs publient des bibliothèques au nom voisin, avec
des interfaces incompatibles. Choisir la mauvaise donne une erreur de
compilation qui parle d'une fonction inconnue, jamais du mauvais choix de
bibliothèque.

| À taper | La bonne | À ne pas confondre avec |
|---|---|---|
| `DHT sensor library` | celle d'Adafruit, la **première** de la liste | `DHT sensor library for ESPx`, `MKL_DHT sensor library`, `TinyDHT sensor library` |
| `Adafruit SSD1306` | celle d'Adafruit | `SSD1306Ascii`, `ESP8266 and ESP32 OLED driver for SSD1306` |
| `ArduinoJson` | celle de Benoît Blanchon | `Arduino_JSON`, qui est une autre bibliothèque officielle |

Le repère sûr est le code lui-même. Le sketch écrit `#include <DHT.h>` puis
`DHT dht(PIN_DHT, DHT22);` : c'est l'interface d'Adafruit. Celle d'ESPx
s'utiliserait avec `DHTesp`, celle d'Arduino_JSON avec `JSONVar` au lieu de
`JsonDocument`. Quand deux bibliothèques portent le même nom, c'est l'appel
dans le code qui tranche, pas la description sur la fiche.

## Les pièges, dans l'ordre où on les rencontre

**Pas de compte, pas de projet.** Voir plus haut. C'est le seul piège qui
fait tout recommencer.

**L'onglet `libraries.txt` n'existe pas au départ.** Il naît du premier
ajout par le Library Manager. Beaucoup de gens cherchent en vain comment
créer le fichier à la main.

**Le nom des broches change d'une carte à l'autre, et c'est le piège qui
coûte le plus cher.** Sur `board-esp32-devkit-c-v4`, celle du module, une
broche GPIO porte **son numéro seul** et la console s'appelle `TX` :

```json
[ "sol:SIG", "esp:34", "green", [ "v0" ] ],
[ "esp:TX",  "$serialMonitor:RX", "", [] ]
```

Les formes `esp:D34` et `esp:TX0`, que l'on rencontre partout dans les
tutoriels, appartiennent à l'autre carte, `board-esp32-devkit-v1`. Wokwi
n'avertit jamais : il ignore le fil, dessine les autres, et lance la
simulation. On obtient un écran noir, une console muette, des capteurs
figés, et pas un seul message d'erreur.

Le symptôme se reconnaît à l'œil : **les fils mal nommés ne sont pas
dessinés**. Si l'alimentation et la masse apparaissent mais pas les fils de
signal, c'est ce problème et rien d'autre. Cette seule différence a coûté
une soirée entière de diagnostic à la préparation du module, pendant
laquelle on a soupçonné tour à tour l'image flash, la table de partitions,
la pile Bluetooth, le firmware et l'extension VS Code.

Deux leçons de méthode valent d'être retenues. La première : le symptôme
visuel disait tout depuis le début, puisque les fils manquaient au dessin,
mais on regardait la console plutôt que le schéma. La seconde : on a
supposé l'outil fautif parce qu'il était le composant le moins familier,
alors que l'erreur était dans notre propre fichier.

**Un fil qui pointe dans le vide ne provoque aucune erreur.** Si un
identifiant de composant du `diagram.json` ne correspond à rien, Wokwi
ignore le fil et lance quand même la simulation, qui affiche alors des
valeurs aberrantes sans le moindre message. Les identifiants attendus sont
`esp`, `sol`, `lum`, `dht` et `oled` : les retrouver dans le schéma est le
meilleur contrôle.

**La compilation échoue tant que les bibliothèques manquent.** Coller le
sketch avant d'ajouter les bibliothèques donne une erreur rouge qui n'a
rien d'alarmant : elle disparaît à l'étape 4.

**La compilation passe par une file d'attente partagée.** Sur le plan
gratuit, Wokwi compile sur ses serveurs et affiche une jauge de charge
ainsi qu'une invitation à payer pour passer devant. La durée n'est donc pas
la même d'un jour à l'autre, et elle peut dépasser la vingtaine de secondes
pour une première compilation.

Bonne nouvelle : une compilation ne se relance que si le **sketch** a
changé. Faire varier le potentiomètre, la température du DHT22 ou la
luminosité ne recompile rien et répond instantanément. C'est justement là
que se passe l'atelier.

Si la fenêtre **Build Servers Busy** apparaît, ce n'est pas une panne de
ton projet, c'est la file d'attente. Réessayer suffit souvent. Sinon,
bascule sur `../simulation/`, qui ne dépend d'aucun serveur.

**Le moniteur série ne s'affiche pas de lui-même.** C'est écrit dans la
documentation de Wokwi et personne ne pense à aller le lire : le panneau
n'apparaît qu'**après** que le programme a imprimé quelque chose. Tant que
rien n'est sorti, on cherche un panneau qui n'existe pas encore, et on
croit à une panne.

Les schémas de ce dossier le forcent à l'affichage :

```json
"serialMonitor": { "display": "always" }
```

Cette clé se place au premier niveau du `diagram.json`, à côté de `parts`
et `connections`. Les valeurs possibles sont `auto`, le défaut, `always` et
`never`. Sur un projet créé de zéro, c'est la première chose à ajouter.

**Le Bluetooth n'est pas simulé.** Voir le tableau en tête de ce document.

## Sept vérifications quand le projet est en place

1. La compilation passe sans erreur, les bibliothèques se chargent.
2. La console série affiche une ligne `[MES ]` toutes les deux secondes.
3. Tourner le potentiomètre à fond à gauche affiche 100 %, à droite 0 %.
4. L'écran OLED affiche l'humeur et la met à jour.
5. Cliquer sur le DHT22 et changer la température : la valeur suit.
6. Sur le projet MQTT, la ligne `[MQTT] connecte` apparaît, et un client
   abonné à `plante/<id>/#` voit les messages arriver.
7. Débrancher le fil `AO` dans le schéma : la valeur part à 0 et non à une
   erreur.

La troisième mérite une remarque. Le potentiomètre se tourne à **gauche**
pour dire « terre humide », parce que le capteur capacitif réel renvoie une
valeur qui baisse quand l'humidité monte. Et les bornes de calibration
écrites dans le sketch ne sont pas celles de ton kit : une calibration ne
se transporte pas d'un capteur à l'autre, c'est déjà vrai entre la
simulation et le réel.
