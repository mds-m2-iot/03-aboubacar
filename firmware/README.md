# Le firmware de la plante · ta part du travail

Ce dossier contient le programme qui tourne sur la carte. Il t'est donné
presque entier : l'écran, la boucle principale, la configuration, la
gestion du WiFi, tout cela est écrit et commenté. Dix trous sont laissés,
répartis sur quatre séances, et ce sont eux qui font la différence entre
une carte qui clignote et une plante qui parle.

Le programme compile et tourne dès maintenant, avec les dix trous en
place. C'est voulu. Tu pars d'une carte qui fonctionne et qui ment : elle
affiche 0 % d'humidité en permanence, elle se croit toujours heureuse,
elle n'envoie rien à personne. Chaque trou comblé fait disparaître un de
ces mensonges.

## Les dix trous

| Trou | Séance | Où | Ce qui manque |
|---|---|---|---|
| 1 | 2 | `capteurs.h` | la moyenne de trois lectures |
| 2 | 2 | `humeur.h` | la conversion du brut en pourcentage |
| 3 | 2 | `humeur.h` | les cinq humeurs |
| 4 | 2 | `bluetooth.h` | envoyer les mesures au téléphone |
| 5 | 2 | `bluetooth.h` | se rendre à nouveau visible après une déconnexion |
| 6 | 3 | `reseau.h` | le testament et l'abonnement aux commandes |
| 7 | 3 | `reseau.h` | publier les mesures sur les sujets du contrat |
| 8 | 6 | `maj.h` | authentifier le manifeste de mise à jour |
| 9 | 6 | `maj.h` | vérifier l'empreinte du binaire téléchargé |
| 10 | 7 | `capteurs.h` | rejouer une journée type |

Pour les retrouver dans le code :

```powershell
Get-ChildItem -Recurse -Include *.h,*.cpp | Select-String "TODO seance"
```

Chaque trou contient la suite d'étapes à écrire, le piège qui coûte du
temps à ceux qui ne le connaissent pas, et la façon de vérifier que c'est
juste. Tu dois pouvoir avancer sans le corrigé. Si un trou ne te suffit
pas, dis-le au formateur : c'est le commentaire qui est en cause, pas toi.

## La console te dit ce qui manque

Chaque trou se signale une fois sur le moniteur série, au moment précis
où le programme passe dedans :

```
[TODO] seance 2, trou 2 : la conversion du brut en pourcentage
[MES ] hum 0.0% (brut 2847) · temp 21.4C · lum 0.0% (brut 3011) · humeur heureuse
```

Cette ligne est ta liste de courses. Quand elle disparaît, le trou est
comblé. Le message ne sort qu'une fois par trou et par démarrage : une
console qui répète la même chose toutes les deux secondes devient
illisible en trente secondes.

Remarque au passage la deuxième ligne, elle est instructive. Les valeurs
brutes bougent, elles, parce que les capteurs sont bien lus. Ce sont les
pourcentages qui restent à zéro, parce que le trou 2 est encore là. Le
firmware ne triche pas : il montre exactement ce qu'il sait faire.

## Compiler, téléverser, écouter

Trois commandes, depuis ce dossier. Le `-e` n'est pas facultatif, il dit
quel mode tu veux : `ble` est celui de la séance 2.

```powershell
py -m platformio run -e ble # compiler
py -m platformio run -e ble -t upload # envoyer sur la carte
py -m platformio device monitor # ouvrir la console
```

**Ne lance pas `pio run` tout court.** Sans `-e`, PlatformIO compile les
six environnements déclarés l'un après l'autre. Ça marche, mais tu
attends six fois plus longtemps pour un seul binaire utile.

Si `pio` répond que la commande est introuvable, c'est normal sous
Windows : l'exécutable n'est pas dans le chemin, et `py -m platformio`
fait exactement la même chose.

### Les six environnements

| `-e` | Ce qu'il fait | Quand |
|---|---|---|
| `ble` | capteurs, écran, annonce Bluetooth, aucun réseau | séance 2 |
| `dual` | en plus, WiFi, MQTT et mise à jour à distance | séances 3 à 6 |
| `demo` | journée rejouée, aucun réseau | séance 7 |
| `esp32dev` | ce que dit `MODE_FIRMWARE` dans `src/config.h`, `ble` par défaut | au choix |
| `simu` | `ble` sans radio, pour le simulateur | sans carte |
| `simu-reseau` | `dual` sans radio, pour le simulateur | sans carte |

Un piège à connaître avant de le rencontrer : téléverser `dual` en dehors
de la salle fait chercher à la carte le réseau `plante-lab`, qui n'existe
que là-bas. Elle affiche une ligne de points pendant quinze secondes,
abandonne, puis continue à mesurer sans réseau. Ce n'est pas une panne,
mais ce n'est pas le mode que tu veux en séance 2.

## Simuler ton propre firmware

Tu peux voir tourner ton code sans carte, dans VS Code, avec l'extension
**Wokwi Simulator**. C'est particulièrement utile entre deux séances,
quand le kit est resté en salle.

```powershell
py -m platformio run -e simu
py ..\outils\fusionner_image.py simu firmware
```

Puis `F1`, «   Wokwi: Start Simulator   », ce dossier ouvert dans VS Code.

L'environnement `simu` est le mode capteurs privé de sa radio. Wokwi ne
simule pas le Bluetooth, sur aucune carte ESP32 : si tu lances un mode
qui allume la radio, la pile cherche un contrôleur qui n'existe pas et la
carte redémarre en boucle toutes les six secondes. Ce n'est pas ton code
qui est en cause, c'est une limite annoncée du simulateur.

Conséquence directe : les trous 4 et 5 ne se testent jamais en
simulation, puisqu'ils touchent au Bluetooth. Ils demandent la carte.

Pour les trous des séances 3 et 6, il faut le second environnement,
`simu-reseau` : c'est le mode réseau privé de sa radio Bluetooth. Wokwi
simule le WiFi et laisse sortir le trafic MQTT, si bien que tu peux voir
tes messages arriver chez un client abonné, sans carte. Le réseau du
simulateur s'appelle `Wokwi-GUEST` et n'a pas de mot de passe : mets
cette valeur dans `src/config.h` avant de compiler cet environnement-là.

```powershell
py -m platformio run -e simu-reseau
py ..\outils\fusionner_image.py simu-reseau firmware
```

Au total, six des dix trous se vérifient sans matériel : 1, 2 et 3 dans
`simu`, puis 6, 7 et 8 dans `simu-reseau`. Le trou 9 devient atteignable
une fois le 8 comblé.

Le dossier `../simulation/` contient par ailleurs le firmware **complet**,
déjà compilé. C'est la cible : ce que ta carte fera quand les dix trous
seront comblés. Compare, c'est fait pour.

## Le contrat fait foi

Les numéros de broches, les UUID Bluetooth, les noms des sujets MQTT, les
seuils et le format des messages sont dans `../docs/CONTRAT.md`. Ce
document est la seule source, et il vaut aussi bien pour le firmware que
pour ton application.

Recopie ces valeurs depuis le contrat, ne les invente pas et ne les
devine pas. Une carte et une application qui ne sont pas d'accord sur un
nom de sujet ne produisent aucune erreur : elles se taisent, chacune
persuadée que l'autre est en panne.
