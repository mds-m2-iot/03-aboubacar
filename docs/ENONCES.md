# Les énoncés des ateliers

Ce document est le tien, binôme. Il donne pour chaque atelier ce que tu
dois obtenir, par où commencer, et comment savoir tout seul que c'est
bon avant de lever la main.

**Comment il est écrit.** Chaque atelier tient en trois blocs. Ce que tu
dois rendre, qui est le critère de validation et rien d'autre. Une marche
à suivre numérotée, qui te donne le point de départ de chaque étape sans
écrire le code à ta place. Et un contrôle que tu fais seul, parce que
savoir vérifier son propre travail fait partie du métier.

**Ce que tu ne trouveras pas ici.** Le code. Les étapes te disent quelle
fonction appeler, quel type utiliser, quelle question te poser. Elles ne
te disent jamais quoi taper. C'est volontaire : un exercice où il ne
reste qu'à recopier ne t'apprend rien, et tu le sais aussi bien que moi.

**Les trous du firmware sont ailleurs.** Ils vivent dans le code
lui-même, dans le dossier `firmware/src` de ton dépôt, avec leur propre
marche à suivre au bout de chaque bloc `TODO`. Cherche-les avec
`Select-String "TODO seance"` sous Windows, ou
`grep -rn "TODO seance" firmware/src` partout ailleurs. Ce document ne
les répète pas.

**Le contrat prime sur tout.** `docs/CONTRAT.md` fige les broches, les
identifiants Bluetooth, les sujets MQTT et les noms exacts des champs. Un
atelier qui semble contredire le contrat, c'est l'atelier qui a tort.
Quand tu hésites sur un nom, tu recopies depuis le contrat, tu ne
l'inventes pas.

---

## Séance 1 · L'adoption

Tu choisis une plante, tu montes ton poste, et tu construis le squelette
de l'application qui la suivra pendant sept séances. Rien de ce que tu
fais aujourd'hui ne se jette : les trois seuils que tu écris ce matin
deviennent du code cet après-midi et pilotent une vraie carte la semaine
prochaine.

### 1.1 · L'adoption

**Ce que tu dois rendre.** Une fiche d'identité remplie, avec une espèce
nommée et trois seuils chiffrés.

**Marche à suivre.**

1. Choisis une espèce réelle et nomme-la précisément. « Une plante verte »
   ne suffit pas ; « Ficus elastica » ou « Pothos » oui. Tu vas devoir
   défendre tes chiffres, donc choisis-en une sur laquelle tu trouves de
   l'information.
2. Cherche ses besoins réels, en humidité du sol surtout. Deux ou trois
   sources concordantes suffisent. Note d'où viennent tes chiffres :
   la question reviendra en soutenance.
3. Pose tes deux seuils, celui de la soif et celui du trop-plein. La
   contrainte à respecter : **au moins vingt points d'écart entre les
   deux**. Trop resserrés, ta plante changera d'humeur en permanence en
   séance 2 et tu croiras à un bug.
4. Écris une phrase par seuil qui justifie le chiffre. Pas un paragraphe,
   une phrase.

**Comment savoir que c'est bon.** Relis tes chiffres en te demandant si
un cactus et une fougère auraient les mêmes. Si oui, tu n'as pas encore
choisi d'espèce, tu as choisi un mot.

### 1.2 · Monter son poste

**Ce que tu dois rendre.** Le contrôle final de la checklist passe au
vert sur ta machine.

**Marche à suivre.**

1. Suis la checklist **dans l'ordre imposé** : Node LTS, Git, VS Code et
   ses extensions, Expo, pilote USB-série, puis les comptes. Un ordre
   différent produit des pannes qui n'ont aucun rapport avec leur cause,
   et tu passeras une heure à chercher au mauvais endroit.
2. Pour le pilote USB-série, ne devine pas. Trois puces sont possibles
   selon la carte. Lis d'abord l'identifiant du fabricant avec la
   commande `Get-PnpDevice` de la checklist, et choisis le pilote
   ensuite : `VID_10C4` pour un CP2102, `VID_1A86` pour un CH340 ou un
   CH9102.
3. Sous Windows, si une commande `python` ouvre le Microsoft Store, tu es
   tombé sur le faux `python.exe` du dossier `WindowsApps`. C'est la
   panne Windows la plus fréquente de cette séance et la checklist dit
   comment la désarmer.
4. Lance le contrôle final et corrige jusqu'au vert.

**Comment savoir que c'est bon.** Le contrôle est vert et tu as branché
une carte que ton système reconnaît. Ne pars pas sans : un poste qui
n'est pas prêt ce soir coûte la séance 2 entière.

### 1.3 · Choisir sa stack

**Ce que tu dois rendre.** La grille remplie, trois arguments par cas, et
la colonne du renoncement remplie elle aussi.

**Marche à suivre.**

1. Lis les trois cas avant d'écrire quoi que ce soit. Ils sont conçus
   pour ne pas avoir la même réponse.
2. Pour chaque cas, écris trois arguments **en faveur** de ton choix.
   Appuie-les sur des contraintes du cas, pas sur des préférences : le
   budget, le délai, l'accès au matériel, les compétences de l'équipe
   décrite.
3. Remplis la dernière colonne, celle qu'on oublie toujours : **qu'est-ce
   qui te ferait changer d'avis ?** Un signal concret, observable. Si tu
   n'en trouves aucun, c'est que tu défends une opinion et pas une
   décision.
4. Écris ce que ton choix coûte. Tout choix de stack renonce à quelque
   chose, et savoir à quoi vaut mieux que de le découvrir en production.

**Comment savoir que c'est bon.** Ce qui est corrigé ici, c'est la
qualité de tes arguments et ta lucidité sur ce que ton choix coûte,
jamais la réponse elle-même. Un binôme qui défend le cross-plateforme
sur le cas de la banque avec de bons arguments a raison de le faire.

### 1.4 · Le squelette de l'application

**Ce que tu dois rendre.** Un projet Expo qui démarre, avec trois écrans
navigables et les valeurs de ta fiche d'identité affichées.

**Marche à suivre.**

1. Crée le projet toi-même avec `npx create-expo-app`, en TypeScript.
   Prends le temps de regarder ce qu'il génère : tu vas vivre dedans
   pendant sept séances.
2. Installe les dépendances avec `npx expo install` et **jamais** avec
   `npm install`. La première commande choisit les versions compatibles
   avec ta version d'Expo, la seconde prend les dernières et casse la
   compilation d'une manière difficile à diagnostiquer.
3. Mets en place la navigation à onglets d'Expo Router. Le principe :
   chaque fichier du dossier `app/` devient une route. Le fichier
   `_layout.tsx` décrit ce qui entoure les écrans.
4. Crée tes trois écrans : l'accueil, les réglages, et la fiche d'une
   plante. Le troisième est une **route dynamique** : le fichier
   s'appelle littéralement `[id].tsx`, crochets compris. C'est le seul
   point qui surprend tout le monde.
5. Copie `docs/contrat.ts` depuis le dépôt du cours dans ton projet, par
   exemple en `lib/contrat.ts`. C'est la seule pièce de code qu'on te
   fournit, parce que c'est une interface partagée et non du code
   d'application.
6. Affiche les valeurs de ta fiche d'identité sur l'accueil. En dur pour
   l'instant, elles viendront des capteurs en séance 2.

**Comment savoir que c'est bon.** L'application se lance sur ton
téléphone, tu passes d'un écran à l'autre, et la fiche d'une plante
s'ouvre depuis l'accueil. Le style est libre, et il compte : cette
application doit te ressembler.

### 1.5 · La plante simulée

**Ce que tu dois rendre.** Une capture du simulateur montrant une plante
déclarée assoiffée.

**Marche à suivre.**

1. Ouvre le projet Wokwi fourni. Il simule la carte, le capteur
   d'humidité et l'écran, sans matériel.
2. Repère le potentiomètre : c'est lui qui remplace le capteur
   d'humidité. Le faire tourner change la valeur brute lue.
3. Lance la simulation et regarde la console. Tu dois voir les mesures
   défiler.
4. Tourne le potentiomètre jusqu'à faire passer la plante en état
   assoiffé, et capture l'écran.

**Comment savoir que c'est bon.** L'écran simulé annonce la soif et la
console montre une valeur cohérente. Si rien ne bouge quand tu tournes,
c'est que tu n'as pas le bon environnement de compilation : le
simulateur a le sien.

---

## Séance 2 · Ta plante parle

Tu câbles le kit, tu combles les cinq premiers trous du firmware, et tu
fais parler la carte à ton téléphone en Bluetooth. À la fin de la séance,
une vraie plante affiche une vraie humeur sur un vrai téléphone, sans
réseau et sans serveur.

### 2.1 · Assembler et flasher son kit

**Ce que tu dois rendre.** La LED témoin clignote et le nom de ta carte
apparaît dans un scanner Bluetooth.

**Marche à suivre.**

1. **Câble avant de brancher.** La fiche de câblage donne l'ordre des
   broches. Vérifie deux fois l'alimentation et la masse : c'est la seule
   erreur qui peut détruire un composant.
2. Attention au module d'écran. Ses quatre broches sont dans l'ordre
   `GND VDD SCK SDA` en partant du repère : **la masse vient en premier,
   pas l'alimentation**, et l'horloge s'appelle `SCK` et non `SCL`. C'est
   le piège numéro un de cette séance.
3. Branche l'USB et compile le firmware étudiant avec l'environnement
   `ble`. Précise toujours l'environnement : `pio run -e ble -t upload`.
   Sans le `-e`, tu compiles les six environnements du projet.
4. Ouvre la console avec `pio device monitor -e ble`. Le charabia des
   premières lignes est normal, c'est du bruit pendant le redémarrage de
   la carte. Le premier texte lisible est toujours `ets Jul 29 2019`.
5. Installe nRF Connect sur ton téléphone et lance un scan.

**Comment savoir que c'est bon.** La LED bleue de la carte bat
lentement, la console affiche des mesures toutes les deux secondes, et
ta carte apparaît dans le scan sous son nom.

### 2.2 · Installer l'application sur son téléphone

**Ce que tu dois rendre.** Ton application se lance sur le téléphone de
test et affiche son écran d'accueil.

**Le Bluetooth ne fonctionne pas dans Expo Go**, et c'est le vrai sujet
de cet atelier. Expo Go est une application toute faite dans laquelle ton
JavaScript vient s'exécuter ; elle ne contient que le code natif qu'Expo
a décidé d'y mettre, et le Bluetooth n'en fait pas partie. Il te faut
donc ta propre **construction de développement**.

**Marche à suivre.**

1. Installe `expo-dev-client` et `react-native-ble-plx`, toujours avec
   `npx expo install`.
2. Déclare les permissions Bluetooth dans la configuration de
   l'application. Sur Android récent il en faut plusieurs, et la
   localisation en fait partie pour des raisons historiques : un scan
   Bluetooth permet de deviner où tu es.
3. Branche ton téléphone en USB, débogage activé, et lance la
   construction en local :

   ```bash
   npx expo run:android
   ```

   Une seule commande, qui génère le projet natif, le compile,
   l'installe et démarre le serveur de développement. Compte une dizaine
   de minutes la première fois. Va faire autre chose.

**Et la chose que personne ne devine.** Tu ne reconstruiras plus. Cette
construction produit une coquille native ; tout ton JavaScript est
ensuite servi par le serveur de développement, donc tu modifies, tu
enregistres, et l'application se recharge en une seconde. Une nouvelle
construction n'est nécessaire que si tu ajoutes une dépendance
**native**, ce qui t'arrivera deux fois dans tout le module. Reconstruire
à chaque changement de couleur te coûterait un quart d'heure à chaque
fois, et beaucoup de gens le font pendant des semaines avant de
comprendre.

**Comment savoir que c'est bon.** L'application se lance sur ton
téléphone et tu vois ton écran d'accueil. Change une couleur, enregistre,
et regarde-la se recharger toute seule : c'est ce rechargement qui prouve
que tu as compris le montage.

### 2.3 · Ta plante parle enfin

**Ce que tu dois rendre.** Un écran qui affiche trois valeurs qui se
mettent à jour toutes les deux secondes.

**Marche à suivre.**

1. Comble d'abord les trous 4 et 5 du firmware, côté carte. Sans eux, la
   carte ne pousse aucune valeur et tu chercheras une panne côté
   téléphone qui n'existe pas.
2. **Valide la carte à nRF Connect avant d'écrire une ligne
   d'application.** Quand les deux côtés sont neufs, une panne peut venir
   de n'importe où ; quand la carte est déjà prouvée, il ne reste qu'un
   suspect. C'est un réflexe de méthode qui vaut pour toute ta carrière.
3. Côté application, demande les permissions, lance un scan, filtre sur
   l'identifiant de service du contrat. Ne cherche pas par nom : deux
   binômes voisins peuvent avoir le même.
4. Connecte-toi, découvre les services, et abonne-toi aux trois
   caractéristiques de mesure.
5. Décode les octets reçus. Chaque valeur tient sur deux octets, en
   petit-boutiste, et représente la mesure multipliée par cent. Le
   contrat le dit noir sur blanc, section par section.

**Comment savoir que c'est bon.** Souffle sur le capteur de température
ou pince le capteur d'humidité : la valeur doit bouger sur ton téléphone
en moins de deux secondes.

### 2.4 · Calibrer et donner une humeur

**Ce que tu dois rendre.** L'accueil annonce l'humeur, l'écran de détail
montre les trois mesures.

**Marche à suivre.**

1. Calibre ton capteur d'humidité. Relève la valeur **brute** à l'air
   libre, puis dans un verre d'eau. Ces deux nombres sont tes bornes.
2. Attention au sens : la valeur brute **baisse** quand l'humidité monte.
   Le capteur sec donne la plus grande valeur. C'est contre-intuitif et
   c'est la source d'erreur numéro un des trous 1 et 2.
3. Reporte tes deux bornes dans `config.h`, puis comble les trous 1, 2
   et 3 du firmware.
4. Côté application, écris la fonction d'humeur en TypeScript, d'après
   la section 3 du contrat. Elle doit rendre exactement le même résultat
   que ton code C++ : c'est la définition même d'un contrat.
5. Affiche l'humeur sur l'accueil et les trois mesures sur la fiche de
   détail.

**Comment savoir que c'est bon.** Plonge le capteur dans le verre d'eau
et regarde l'humeur passer par tous ses états jusqu'à la noyade. Si elle
saute directement du bonheur au trop-plein sans passer par les cas
extrêmes, l'ordre de tes tests est faux : c'est le trou 3.

---

## Séance 3 · Du Bluetooth au réseau

Ta plante quitte la portée du Bluetooth. Elle publie sur un broker MQTT,
et ton application la lit depuis n'importe où, y compris depuis chez toi
le soir. C'est le passage de l'objet connecté à ton téléphone à l'objet
connecté tout court.

### 3.1 · Mettre sa plante sur le réseau

**Ce que tu dois rendre.** Tes trois mesures apparaissent dans le client
MQTT projeté au tableau.

**Marche à suivre.**

1. Renseigne le réseau WiFi de la salle dans `config.h`. La carte ne sait
   faire que du 2,4 GHz : un réseau en 5 GHz ne sera jamais trouvé et
   l'erreur est muette.
2. Renseigne l'adresse du broker, son port et les identifiants de la
   classe, puis passe `MODE_FIRMWARE` en mode réseau.
3. Compile avec l'environnement `dual` et téléverse.
4. Regarde l'écran de ta carte. Il a trois états et ils te disent où tu
   en es : `pas de wifi` renvoie au réseau, `sans broker` veut dire que
   le WiFi va bien mais que le broker ne répond pas, `reseau ok` veut
   dire que tout tient.
5. Si tu lis `MQTT refuse`, la console te donne le code **et une phrase
   qui l'explique**. Lis-la avant de chercher.

**Comment savoir que c'est bon.** Ton préfixe apparaît dans le client
projeté, avec tes mesures dessous. Si tu vois celles du voisin sous ton
nom, l'un de vous deux s'est trompé d'identifiant de binôme.

### 3.2 · Publier et s'abonner

**Ce que tu dois rendre.** Ton écran affiche les mesures reçues du
broker, et signale s'il est connecté.

**Marche à suivre.**

1. Comble les trous 6 et 7 du firmware. Le 6 apporte le testament, le 7
   la publication des mesures.
2. Côté application, installe `mqtt` et connecte-toi. **Une application
   mobile parle MQTT par WebSocket**, pas en TCP brut : ton URL commence
   par `wss://` et finit par `/mqtt`. Une URL en `mqtt://` échoue au
   niveau du transport avec un message qui ne parle pas de transport.
3. Abonne-toi à ton préfixe et décode le JSON reçu. Les noms des champs
   sont dans le contrat : recopie-les, ne les invente pas.
4. Affiche un indicateur de connexion. Il doit distinguer trois choses :
   connecté, en cours de connexion, et déconnecté. Deux états ne
   suffisent pas.
5. Utilise le message de statut, pas ta propre connexion, pour dire si la
   **plante** est en ligne. Ton téléphone peut être connecté au broker
   pendant que la carte est débranchée.

**Comment savoir que c'est bon.** Débranche ta carte et attends une
trentaine de secondes. Ton application doit annoncer que la plante est
hors ligne, toute seule, sans que tu touches à rien. C'est le testament
du trou 6 qui fait ce travail.

### 3.3 · Basculer sur le broker du cours

**Ce que tu dois rendre.** Ta plante publie vers le serveur du module, et
ton application la reçoit **hors** du réseau de la salle.

**Le broker du cours est en ligne**, joignable de partout, et il est
chiffré.

**Marche à suivre.**

1. Renseigne son nom, son port TLS et les identifiants dans `config.h`,
   et passe le drapeau TLS à 1.
2. Côté application, change l'URL pour celle du serveur. Toujours en
   `wss://`, sur le port standard, avec le chemin `/mqtt`.
3. Téléverse et regarde la console. La connexion prend une à trois
   secondes de plus qu'avant : c'est la poignée de main TLS, et c'est
   normal.
4. **Le test qui compte** : coupe le WiFi de ton téléphone et passe en
   données mobiles. Tes mesures doivent continuer d'arriver.

**Comment savoir que c'est bon.** Ta plante est lisible depuis ton
téléphone en 4G, hors du réseau de l'école. Ce jour-là, ton projet cesse
d'être une maquette.

### 3.4 · Lancer la collecte de l'inter-période

**Ce que tu dois rendre.** Une courbe des dix dernières minutes, visible
dans la console de la base.

**Marche à suivre.**

1. Ouvre le collecteur, le flux Node-RED du cours, et lis-le. Il s'abonne
   à toutes les plantes, transforme les messages et les écrit dans la
   base de séries temporelles.
2. Repère les trois étages : ce qui écoute, ce qui transforme, ce qui
   écrit. C'est le motif de toute chaîne de collecte, quelle que soit la
   technologie.
3. Vérifie que ton préfixe est bien capté. Le nœud de debug te le dit en
   direct.
4. Ouvre la console de la base et écris une requête sur les dix dernières
   minutes de ta plante.
5. Laisse tourner ta carte **entre les deux séances**. Sans données
   réelles, l'écran d'historique de la séance 4 n'aura rien à montrer.

**Comment savoir que c'est bon.** Ta courbe existe et elle a la forme de
ce que tu as fait subir à ton capteur. Si elle est plate, ta carte n'a
pas publié ou le collecteur ne t'a pas capté : le nœud de debug tranche.

---

## Séance 4 · La mémoire et le quotidien

Une plante qui n'affiche que l'instant présent n'apprend rien à
personne. Tu lui donnes une mémoire, puis tu la rends utilisable un jour
ordinaire : dans le métro, sans réseau, et quand elle a soif pendant que
tu regardes ailleurs.

### 4.1 · La mémoire de la plante

**Ce que tu dois rendre.** Un écran d'historique lisible, avec un
sélecteur de période et des trous visibles.

**Marche à suivre.**

1. Ajoute un écran d'historique à ta navigation. Nouveau fichier dans
   `app/`, nouvelle route, comme en séance 1.
2. Interroge la base de séries temporelles depuis l'application. Le jeton
   qu'on te donne est en **lecture seule** : ne cherche pas à écrire avec.
3. **Agrège côté serveur, pas côté téléphone.** Demande une moyenne par
   fenêtre de temps, pas quatorze jours de mesures brutes. C'est la
   différence entre une réponse de quelques kilo-octets et une réponse de
   plusieurs mégaoctets, et elle se voit à l'œil nu sur la fluidité.
4. Trace la courbe avec `react-native-svg`. Pas besoin d'une
   bibliothèque de graphiques : deux axes et une ligne suffisent, et tu
   comprendras ce que tu dessines.
5. Ajoute un sélecteur de période, au moins trois choix.
6. **Ne relie pas les trous.** Quand la plante était débranchée, la
   courbe doit montrer un vide. Une ligne droite entre les deux bords est
   un mensonge, et c'est le point que la correction regarde en premier.

**Comment savoir que c'est bon.** La courbe s'affiche en moins de deux
secondes, le sélecteur change vraiment la fenêtre, et le trou de la nuit
où ta carte était débranchée se voit.

### 4.2 · Robuste au quotidien

**Ce que tu dois rendre.** Des données datées en mode avion, un rattrapage
à la reconnexion, et une notification quand le seuil est franchi.

**Marche à suivre.**

1. Stocke la dernière mesure connue avec AsyncStorage, à chaque réception.
2. Au démarrage, affiche cette valeur immédiatement, **avec son âge**.
   « Il y a 3 minutes » et « il y a 2 jours » ne se lisent pas pareil, et
   une donnée sans date est une donnée qui ment.
3. Passe en mode avion et vérifie que l'application ne montre pas un
   écran vide. Un écran vide donne l'impression d'une panne.
4. Gère la reconnexion. La bibliothèque MQTT le fait pour toi, mais tu
   dois traiter le fait que des messages ont été manqués : au retour, va
   rechercher ce qui s'est passé pendant l'absence.
5. Ajoute une notification locale au franchissement du seuil de soif.
   Installe `expo-notifications`, demande la permission, et déclenche.
6. **Anti-harcèlement obligatoire.** Une plante qui oscille autour du
   seuil ne doit pas produire quarante notifications. Un rappel par jour
   au maximum, ou une hystérésis. C'est ce point que la correction
   regarde, pas le fait que la notification parte.

**Comment savoir que c'est bon.** Mode avion : la dernière valeur
s'affiche avec son âge. Retour du réseau : ça se met à jour tout seul.
Et fais tourner ta plante autour du seuil pendant dix minutes sans
recevoir dix notifications.

---

## Séance 5 · Revue et sécurité

Tu montres ton travail à d'autres, tu regardes le leur, et tu audites ta
propre chaîne. C'est la séance la moins spectaculaire et la plus utile :
personne ne devient bon sans se faire relire.

### 5.1 · Montrer où tu en es

**Ce que tu dois rendre.** Huit minutes tenues, ta plante en direct, et
une grille de revue remplie par chaque observateur.

**Marche à suivre.**

1. Prépare une démonstration de huit minutes. Chronomètre-toi une fois
   avant : personne ne tient dans le temps sans avoir essayé.
2. **Montre la plante en direct.** Pas une capture, pas une vidéo. Une
   démonstration en direct qui rate est plus instructive qu'un
   enregistrement qui marche.
3. Prépare ton plan de repli. Si le réseau tombe, qu'est-ce que tu
   montres ? La réponse doit exister avant de passer, pas pendant.
4. Pendant le passage des autres, remplis la grille de revue. Une grille
   remplie de « bien » ne sert à personne : cherche une chose précise à
   dire, même petite.

**Comment savoir que c'est bon.** Tu as tenu huit minutes, ta plante a
réagi devant témoins, et tu repars avec des remarques écrites que tu
n'avais pas vues seul.

### 5.2 · Auditer sa propre chaîne

**Ce que tu dois rendre.** Un backlog de cinq lignes au maximum,
ordonné, avec les renoncements écrits.

**Marche à suivre.**

1. Cherche tous les secrets de ton code. Identifiants du broker, jetons
   de base de données, clés diverses. Cherche dans le code **et dans
   l'historique Git** : un secret retiré mais présent dans un ancien
   commit reste trouvable.
2. Sors-les du code. Côté application, `expo-secure-store` pour ce qui
   doit rester sur le téléphone, variables d'environnement pour le reste.
3. Regarde ce qui transite en clair. Ton trafic MQTT est chiffré depuis
   la séance 3 ; le reste l'est-il ?
4. Liste ce que tu publies. Sur un sujet MQTT public, un nom de personne
   ou une position n'a rien à faire. Le contrat l'interdit, vérifie que
   tu le respectes.
5. **Écris cinq lignes maximum**, ordonnées par risque décroissant. Et
   pour chacune, ce que tu renonces à faire et pourquoi.

**Comment savoir que c'est bon.** Ton backlog tient en cinq lignes et
chacune est actionnable. « Améliorer la sécurité » n'est pas une ligne.
« Le jeton InfluxDB est en écriture alors que l'application ne lit
jamais » en est une.

---

## Séance 6 · Durcir, tester, distribuer

Tu passes ton application à l'analyse statique, tu écris les tests qui
comptent, et tu apprends à livrer une mise à jour sans casser ce qui
marche. C'est la séance qui sépare un projet d'école d'un produit.

### 6.1 · Blinder la chaîne

**Ce que tu dois rendre.** Deux rapports d'analyse, avant et après, et un
dossier sécurité de trois pages.

**Marche à suivre.**

1. Produis un premier rapport d'analyse statique de ton application. Ne
   corrige rien encore : c'est ton point de départ, et il doit être
   horodaté.
2. Lis le rapport en séparant deux choses : ce qui est un vrai problème
   chez toi, et ce qui est un avertissement générique. Un outil qui rend
   quatre-vingts alertes ne dit pas que tu as quatre-vingts failles.
3. Corrige ce qui compte, en commençant par les secrets et les
   permissions excessives.
4. Refais un rapport et compare.
5. Écris trois pages : ce que tu as trouvé, ce que tu as corrigé, et **ce
   que tu n'as pas corrigé avec la raison**. La troisième partie est
   celle qui vaut des points.

**Comment savoir que c'est bon.** L'écart entre les deux rapports
s'explique ligne par ligne, et tu sais nommer ce qui reste ouvert.

### 6.2 · Écrire les trois tests clés

**Ce que tu dois rendre.** Trois tests qui passent, lancés par une seule
commande documentée.

**Marche à suivre.**

1. Choisis trois choses à tester, pas trente. Le bon critère : qu'est-ce
   qui, si ça casse, rend l'application fausse sans qu'on le voie ?
2. Le premier test est tout trouvé : la fonction d'humeur. Elle a des
   entrées simples, des sorties énumérées, et elle doit correspondre
   exactement au firmware. Teste **les frontières**, pas le milieu : à
   `seuilBas` exactement, à un point en dessous, à un point au dessus.
3. Le deuxième : le décodage des octets Bluetooth ou du JSON MQTT. C'est
   là que les erreurs sont silencieuses.
4. Le troisième est le tien, et tu dois pouvoir dire pourquoi celui-là.
5. Documente la commande unique qui lance tout, dans ton README.

**Comment savoir que c'est bon.** Un collègue qui clone ton dépôt lance
une commande et voit trois tests verts, sans te poser de question.

### 6.3 · Distribuer et mettre à jour

**Ce que tu dois rendre.** Une beta installée chez un autre binôme, et un
firmware numéroté avec sa procédure de retour arrière.

**Marche à suivre.**

1. Produis une version de test de ton application et fais-la installer
   par un autre binôme. Pas par toi : la moitié des problèmes de
   distribution ne se voient que sur une machine qui n'est pas la tienne.
2. Comble les trous 8 et 9 du firmware. Le 8 authentifie le manifeste, le
   9 vérifie le binaire téléchargé.
3. **Comprends la différence entre les deux**, elle est le cœur de la
   séance. Le trou 8 répond à « qui me parle ». Le trou 9 répond à « ce
   que j'ai reçu est-il ce qu'on m'avait annoncé ». Un téléchargement
   coupé n'a rien de malveillant et casse tout aussi sûrement.
4. Numérote ta version de firmware et publie une mise à jour.
5. Écris la procédure de retour arrière et **fais-la exécuter par
   quelqu'un d'autre**. Une procédure qu'on n'a jamais suivie n'existe
   pas.

**Comment savoir que c'est bon.** Ta mise à jour s'installe, et un
manifeste dont tu falsifies l'empreinte est refusé sans que la carte
redémarre dessus.

---

## Séance 7 · La boîte et la soutenance

Tu prépares une démonstration qui tiendra une journée entière sans toi,
et tu défends ton projet. Ce n'est pas une formalité de fin de module :
savoir montrer ce qu'on a fait est une compétence, et elle se travaille.

### 7.1 · Passer sa propre revue

**Ce que tu dois rendre.** Quatre cases cochées, ou la liste écrite de ce
qui reste avant midi.

**Marche à suivre.**

1. Prends la checklist finale et passe-la sur ton propre projet, honnêtement.
2. Ce qui n'est pas coché ne se cache pas : ça s'écrit avec une estimation
   du temps nécessaire.
3. Ordonne ce qui reste par ce qui se verra en soutenance. Un détail
   invisible passe après une panne visible, toujours.
4. Attaque la liste dans cet ordre, et arrête-toi à midi quoi qu'il
   arrive.

**Comment savoir que c'est bon.** Tu sais dire en une phrase où en est
ton projet, et cette phrase est vraie.

### 7.2 · Répétition croisée

**Ce que tu dois rendre.** Trois failles trouvées chez le voisin, et tes
propres corrections appliquées.

**Marche à suivre.**

1. Passe ta démonstration devant un autre binôme, en conditions réelles,
   chronomètre en marche.
2. Quand c'est ton tour d'observer, cherche **trois failles précises**.
   Pas trois compliments. Une transition qui traîne, une explication
   qu'on ne comprend pas, un moment où on ne sait plus où regarder.
3. Note ce qu'on te dit sans te défendre. Tu discuteras après.
4. Applique au moins deux des trois remarques que tu reçois.

**Comment savoir que c'est bon.** Ta deuxième répétition est plus courte
que la première et plus claire. C'est presque toujours le cas, et c'est
tout l'intérêt de l'exercice.

### 7.3 · Préparer la boîte

**Ce que tu dois rendre.** Une boîte complète, un runbook testé par un
binôme qui ne l'a pas écrit, et une application qui affiche une journée
qui défile, téléphone en mode avion.

**Marche à suivre.**

1. Comble le trou 10 du firmware. Il rejoue une journée type en quelques
   minutes, sans capteur et sans réseau.
2. Côté application, écris la source « démonstration ». Une mesure toutes
   les deux secondes, calculée à partir de l'heure dans une journée type
   de quatre minutes, avec les mêmes formules que le trou 10 que tu viens
   de combler, pour que le téléphone et l'écran de la carte racontent la
   même journée. Prévois aussi un historique rejoué, et fais-y deux
   coupures : ce sont elles qui prouvent que ta courbe se coupe au lieu
   de mentir.
3. Monte la boîte physiquement. Elle doit survivre à être portée,
   branchée et débranchée par quelqu'un qui n'y connaît rien.
4. Écris le runbook : brancher, attendre, quoi faire si rien ne s'affiche.
   Une page maximum.
5. **Fais-le exécuter par un binôme qui ne l'a pas écrit**, sans que tu
   parles. Chaque fois que tu as envie d'intervenir, c'est une ligne à
   ajouter.
6. Vérifie que la démonstration **repart toute seule**. Une boîte qui se
   fige au bout d'un quart d'heure n'est pas une démonstration, et
   personne ne s'en aperçoit avant le troisième visiteur.

**Comment savoir que c'est bon.** Quelqu'un d'autre branche la boîte,
suit ta page, et ça marche. Sans toi dans la pièce.

### 7.4 · Soutenir son projet

**Ce que tu dois rendre.** Une démonstration en direct avec ta plante, et
des réponses individuelles à chaque question.

**Marche à suivre.**

1. Structure ton passage : ce que tu as construit, comment, ce que tu
   as appris, ce que tu ferais autrement. Le dernier point est celui
   qu'on écoute le plus.
2. Prépare tes limites avant qu'on te les demande. Le secret partagé dans
   le firmware, le certificat non vérifié, le compte unique de la classe :
   savoir nommer une limite vaut mieux que d'espérer qu'on ne la voie pas.
3. Répartis la parole dans le binôme. Chacun doit pouvoir répondre sur
   tout, pas seulement sur sa partie.
4. Garde ta plante allumée pendant les questions. Elle est la meilleure
   réponse à la moitié d'entre elles.

**Comment savoir que c'est bon.** Tu réponds « je ne sais pas, mais voilà
comment je chercherais » au moins une fois. C'est la meilleure réponse
possible à une question dont tu n'as pas la réponse, et tout le monde
préfère l'entendre qu'une improvisation.
