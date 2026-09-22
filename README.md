# Ma plante connectée · le dépôt de départ

Bienvenue. Tu tiens le point de départ du projet du module M2
« Applications mobiles et connectées (IoT) ». Pendant sept séances, tu vas
faire parler une vraie plante : une carte qui lit trois capteurs, une
application qui l'écoute, et tout ce qu'il faut entre les deux.

Ce dépôt te donne trois choses : le firmware de la carte, presque entier,
avec dix trous à combler ; de quoi faire tourner la plante sans matériel
dès aujourd'hui ; et le contrat qui garantit que ta carte et ton
application parleront la même langue.

Il ne contient pas d'application. Tu la crées toi-même, et c'est délibéré.

---

## 1. Ton dépôt de binôme

Ce dépôt-ci est un **modèle**, partagé par toute la promotion. Tu ne
travailles pas dedans : tu travailles dans une copie qui porte ton nom, et
c'est cette copie qui sera lue et évaluée.

Selon ce que t'a dit le formateur, ta copie existe déjà et il ne te reste
qu'à la cloner, ou bien tu la fabriques toi-même : sur la page GitHub de
ce dépôt, bouton vert **Use this template**, puis **Create a new
repository**.

Le nom suit un format unique, `plante-binome-03`, où `03` est le numéro
que ton binôme reçoit en séance 1. Ce numéro sert à trois endroits, et il
doit être le même aux trois :

| Où | Quoi |
|---|---|
| Nom du dépôt | `plante-binome-03` |
| Configuration du firmware | `ID_BINOME` dans `firmware/src/config.h` |
| Sujets MQTT | `plante/binome-03/mesures` |

Deux binômes qui portent le même numéro publient sur les mêmes sujets et
mélangent leurs mesures. Rien ne le signale : pas d'erreur, pas
d'avertissement, seulement des courbes qui font des sauts que personne
n'explique. C'est le genre de panne qui coûte une séance entière, et elle
s'évite en trente secondes de vérification avant la séance 3.

---

## 2. Ce que contient ce dépôt

```
firmware/          le programme de la carte, avec dix trous à combler
  README.md        la liste des trous, séance par séance
  src/             les sources, largement commentées
docs/
  CONTRAT.md       la référence commune à la carte et à l'application
  contrat.ts       le même contrat en TypeScript, à recopier dans ton app
simulation/        le firmware complet déjà compilé, à faire tourner sans carte
wokwi/             deux projets pour le simulateur en ligne
outils/            de quoi fabriquer l'image de ton propre firmware simulé
```

Nulle part une application. Voir la section 5.

---

## 3. La plante avant la plante

Tu n'as besoin ni de la carte ni du téléphone pour commencer. Deux façons
de faire tourner la plante sans matériel, et les deux servent dès la
séance 1.

**Sur ton poste, dans VS Code.** Le dossier `simulation/` contient le
firmware complet déjà compilé et le schéma de câblage. Rien à installer
côté ESP32, rien à compiler. Trois étapes, dans
`simulation/LISEZ-MOI.md`. C'est la version du formateur : elle te montre
où tu vas.

**Dans le navigateur, sur wokwi.com.** Le dossier `wokwi/` contient deux
projets à recopier dans l'éditeur en ligne : `s1-capteurs` pour les trois
capteurs et l'écran, `s3-mqtt` pour la même chose plus la publication
MQTT. Tout est dans `wokwi/README.md`, pièges compris.

Une limite à connaître tout de suite : **Wokwi ne simule pas le
Bluetooth**, sur aucune carte de la famille ESP32. La séance 2 se fait
donc sur le vrai matériel, et elle ne se rattrape pas en simulation.

---

## 4. Le firmware, ta part du travail

Le programme de la carte t'est donné presque entier. Dix trous restent,
répartis sur quatre séances : cinq en séance 2 autour des capteurs et du
Bluetooth, deux en séance 3 sur MQTT, deux en séance 6 sur la mise à jour
à distance, un en séance 7 pour le mode démonstration.

Le tout compile et tourne avec les dix trous en place. Tu pars d'une carte
qui fonctionne et qui ment : elle affiche 0 % d'humidité en permanence,
elle se croit toujours heureuse, elle n'envoie rien à personne. Chaque
trou comblé fait disparaître un de ces mensonges, et la console te dit
lequel il reste :

```
[TODO] seance 2, trou 2 : la conversion du brut en pourcentage
```

La liste complète, la façon de compiler et de simuler ton propre firmware
sont dans `firmware/README.md`.

---

## 5. L'application, tu la crées

Il n'y a pas de squelette d'application dans ce dépôt, et ce n'est pas un
oubli. Voir la structure d'un projet Expo naître sous ses doigts vaut
mieux que la recevoir toute faite, et le résultat doit te ressembler.

```powershell
npx create-expo-app@latest mon-app
cd mon-app
npx expo start
```

Puis tu recopies `docs/contrat.ts` dans ton application, par exemple en
`lib/contrat.ts`. C'est le seul fichier qu'on te donne, et il ne se
modifie pas : il tient les UUID Bluetooth, les noms des sujets MQTT et les
types partagés avec la carte.

### Ce qui est imposé, et ce qui ne l'est pas

| Imposé | Libre |
|---|---|
| Trois écrans navigables : accueil, fiche de la plante, réglages | La mise en page, la palette, la typographie |
| Les valeurs de ta fiche d'identité, remplie en séance 1 | L'organisation des dossiers |
| `contrat.ts` recopié tel quel | Le gestionnaire d'état, s'il t'en faut un |
| Aucun secret dans le code source | Les animations, les icônes, le nom de l'application |

Une seule interdiction, et elle se justifie : **pas de bibliothèque de
composants toute faite**. Le module porte sur ce qui se passe sous le
capot, et un catalogue de composants prêts à l'emploi te priverait
justement de ce qu'on vient y apprendre. La discipline, en revanche, est
la bienvenue : une palette dans un fichier plutôt que des couleurs
dispersées, ça n'a jamais fait de mal à personne.

### Ce que tu ajoutes, séance par séance

| Séance | Ce que ton application gagne |
|---|---|
| 1 | Trois écrans et la navigation entre eux |
| 2 | Le Bluetooth : scanner, se connecter, recevoir les mesures |
| 3 | MQTT en WebSocket, pour lire la plante de n'importe où |
| 4 | L'historique, le hors ligne, les alertes |
| 5 | Les secrets hors du code, le stockage sécurisé |
| 6 | Les tests, et la mise à jour de la carte à distance |
| 7 | Le mode démonstration, sans carte et sans réseau |

### Quatre pièges qui reviennent chaque année

Ils coûtent une demi-séance chacun à ceux qui ne les connaissent pas.

Le capteur capacitif renvoie une valeur qui **baisse** quand l'humidité
monte. Il faut **arrêter le scan Bluetooth** dès l'appareil trouvé, avant
d'appeler `connect()`. Une application mobile parle MQTT **par
WebSocket**, jamais en `mqtt://`. Et une valeur absente **reste absente**
sur un graphique, elle ne se relie pas par un trait.

Deux règles de méthode s'y ajoutent, et elles se défendent en soutenance :
on filtre avant d'agréger dans une requête, et aucun identifiant ne vit
dans le code source.

---

## 6. Le contrat fait foi

`docs/CONTRAT.md` est la seule source pour les numéros de broches, les
UUID Bluetooth, les noms des sujets MQTT, les seuils et le format des
messages. Ce document vaut aussi bien pour le firmware que pour ton
application, et c'est ce qui permet aux deux de se parler.

Recopie ces valeurs depuis le contrat, ne les invente pas et ne les devine
pas. Une carte et une application qui ne sont pas d'accord sur un nom de
sujet ne produisent aucune erreur : elles se taisent, chacune persuadée
que l'autre est en panne. C'est la panne la plus coûteuse du module, et la
seule qui soit entièrement évitable.

---

## 7. Ce que tu rends

Un seul dépôt Git par binôme, celui que tu as créé en section 1, contenant
le firmware complété et ton application. Les commits comptent autant que
le résultat : ils racontent comment vous avez travaillé, et un dépôt qui
n'a qu'un seul commit la veille du rendu se voit tout de suite.

La date de rendu est annoncée en séance 1 et elle est la même dans tous
les documents du module.
