# La plante simulée

Ce dossier fait tourner la carte de la plante sur ton ordinateur, sans
carte et sans rien compiler. C'est le même firmware que celui qui sera
flashé sur le vrai matériel en séance 2, à une différence près : sa radio
est désactivée, parce que le simulateur ne sait pas simuler le Bluetooth.
Tout le reste est identique, broches comprises.

## Trois étapes

1. Dans VS Code, installer l'extension **Wokwi Simulator**.
2. Appuyer sur **F1**, choisir « Wokwi: Request a new License », et suivre
   le lien. La licence est gratuite et ne se demande qu'une fois.
3. Ouvrir **ce dossier** dans VS Code, appuyer sur **F1**, choisir
   « Wokwi: Start Simulator ».

Attention à la troisième étape : c'est bien ce dossier-ci qu'il faut
ouvrir, pas la racine du dépôt. L'extension cherche un `wokwi.toml` à côté
du dossier ouvert, et ne dit rien de très clair quand elle ne le trouve
pas.

## Ce que tu dois voir

La carte démarre, l'écran s'allume, et la console affiche une ligne de
mesure toutes les deux secondes.

Fais varier les capteurs à la souris : tourne le potentiomètre vers la
**gauche** pour simuler une terre humide, passe la souris sur la
photorésistance, clique sur le DHT22 pour changer la température.

Le potentiomètre qui se tourne à gauche pour dire « humide » n'est pas une
bizarrerie du simulateur. Le capteur capacitif réel se comporte exactement
ainsi : sa valeur **baisse** quand l'humidité monte. C'est le premier des
quatre pièges du module, et c'est le trou 2 du firmware qui le traite,
dans `../firmware/src/humeur.h`.

## Ce dossier n'est pas celui que tu vas modifier

Le binaire d'ici est le firmware **complet**, celui de ton formateur.
C'est la cible : ce que ta carte fera quand les dix trous de
`../firmware/` seront comblés. Garde-le sous la main pour comparer, et
lance-le quand tu veux revoir le comportement attendu.

## Ce que ce dossier contient

| Fichier | Rôle |
|---|---|
| `wokwi.toml` | dit au simulateur quel binaire lancer |
| `firmware.bin` | le firmware compilé, prêt à exécuter |
| `firmware.elf` | les symboles, pour que les erreurs soient lisibles |
| `diagram.json` | le câblage : trois capteurs et un écran |

## Pour l'atelier

Trois questions, et les réponses se lisent dans le code du firmware
lui-même, dans `../firmware/src/` :

1. À quelle fréquence la carte lit-elle ses capteurs ?
2. Que se passe-t-il quand un capteur est débranché ?
3. Où sont écrits les seuils qui décident de l'humeur ?

Pour la deuxième, tu peux vérifier ta réponse sans rien casser : dans
`diagram.json`, supprime la ligne du fil qui relie `sol:SIG` à `esp:34`,
relance, et observe. La valeur ne part pas en erreur, elle part à zéro. La
raison tient en une phrase, et elle vaut d'être comprise : GPIO34 est une
broche d'entrée seule, sans résistance interne, donc elle flotte.
