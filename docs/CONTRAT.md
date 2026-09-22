# Contrat d'interface · Ma plante connectée

Ce document fige ce que la carte, l'application et le serveur se promettent.
Toute modification ici se répercute dans les trois, et dans les supports de cours.

Version du contrat : **1.0.0** · module M2 Applications mobiles et connectées (IoT)

---

## 1. Brochage (fige la fiche de câblage de la séance 2)

| Capteur | Broche du module | GPIO | Type |
|---|---|---|---|
| Humidité du sol, capacitif v1.2 | AOUT | **34** | analogique, ADC1 |
| Lumière, LM393 4 broches | AO | **35** | analogique, ADC1 |
| Température et humidité de l'air, DHT22 | DATA | **25** | numérique |
| Écran OLED SSD1306 | SDA / SCL | **21 / 22** | I2C, adresse 0x3C |

Alimentation en **3,3 V uniquement**. Les deux entrées analogiques restent sur
l'ADC1 (GPIO32 à GPIO39), le seul convertisseur utilisable quand le WiFi est allumé.

---

## 2. Mesures

Une mesure est un triplet, produit toutes les `PERIODE_MESURE_MS` (2000 ms par défaut).

| Grandeur | Clé | Unité | Plage attendue |
|---|---|---|---|
| Humidité du sol | `humidite` | % (0 à 100, calibré) | 0 à 100 |
| Température de l'air | `temperature` | °C | -40 à 80 |
| Lumière | `lumiere` | % (0 à 100, calibré) | 0 à 100 |
| Humidité de l'air | `humidite_air` | % | 0 à 100 |

Les valeurs brutes du convertisseur (0 à 4095) ne sortent jamais de la carte,
sauf par la caractéristique de diagnostic et par le sujet `.../brut`.

### Calibration

Le capteur capacitif renvoie une valeur qui **baisse** quand l'humidité monte.

```
humidite_pct = clamp(0, 100, (SEC - brut) * 100 / (SEC - HUMIDE))
```

`SEC` et `HUMIDE` sont propres à chaque capteur, mesurés à l'air libre et dans
un verre d'eau, et vivent dans `config.h` côté carte et dans les réglages côté
application. Valeurs relevées sur le kit du module : `SEC = 3220`,
`HUMIDE = 980`. Elles servent de point de départ, chaque binôme relève les
siennes : une calibration ne se transporte pas d'un capteur à l'autre.

Le module de lumière LM393 renvoie une valeur qui baisse quand la lumière monte :

```
lumiere_pct = clamp(0, 100, (SOMBRE - brut) * 100 / (SOMBRE - CLAIR))
```

Valeur relevée sur le kit du module : `SOMBRE = 4030`, capteur couvert
de la main. `CLAIR = 400` reste une référence de pleine lumière, à relever
avec une source vive : en intérieur ordinaire le capteur lit plutôt 600.

---

## 3. Humeur

Cinq états, calculés à partir de `humidite` et des seuils de l'espèce.
La même fonction existe côté carte dans `humeur.h`, et doit exister côté
application en TypeScript, avec les mêmes bornes : c'est sur elle que porte
le test unitaire de la séance 6.

| Humeur | Condition | Message par défaut |
|---|---|---|
| `noyee` | `humidite > seuilHaut + 15` | « Je nage, arrête un peu » |
| `reput` | `humidite > seuilHaut` | « J'ai un peu trop bu » |
| `heureuse` | `seuilBas <= humidite <= seuilHaut` | « Tout va bien, merci » |
| `soif` | `humidite < seuilBas` | « J'ai soif » |
| `assoiffee` | `humidite < seuilBas - 15` | « Au secours, de l'eau » |

Seuils par défaut, surchargés par la fiche d'identité de la plante :
`seuilBas = 30`, `seuilHaut = 70`.

Deux états techniques s'ajoutent côté application, jamais côté carte :
`inconnue` (aucune donnée) et `perimee` (dernière mesure de plus de 5 minutes).

---

## 4. Bluetooth Low Energy (séance 2)

Nom annoncé : valeur de `NOM_PLANTE` dans `config.h`, `Plante-Demo` par défaut.

| Élément | UUID |
|---|---|
| Service Plante | `6d5a0001-9b7d-4c2a-8f10-2b1e5a7c3d40` |
| Humidité du sol, `%` ×100, uint16 | `6d5a0002-9b7d-4c2a-8f10-2b1e5a7c3d40` |
| Température, °C ×100, int16 | `6d5a0003-9b7d-4c2a-8f10-2b1e5a7c3d40` |
| Lumière, `%` ×100, uint16 | `6d5a0004-9b7d-4c2a-8f10-2b1e5a7c3d40` |
| Statut JSON, lecture seule | `6d5a0005-9b7d-4c2a-8f10-2b1e5a7c3d40` |

Les trois caractéristiques de mesure sont en `READ | NOTIFY`, encodées en
**little-endian**, valeur multipliée par 100 pour garder deux décimales sans flottant.

```
humidite_pct = valeur_uint16 / 100.0
temperature_c = valeur_int16 / 100.0
```

La caractéristique de statut renvoie le même objet JSON que le sujet `.../statut`.

---

## 5. MQTT (séance 3)

Préfixe : `plante/<identifiant-binome>`, par exemple `plante/binome-03`.
Aucun nom de personne, aucune position, jamais : le sujet circule en clair.

| Sujet | Sens | Charge utile | Retenu | Garantie |
|---|---|---|---|---|
| `plante/<id>/humidite` | carte → | nombre, % | non | 0 |
| `plante/<id>/temperature` | carte → | nombre, °C | non | 0 |
| `plante/<id>/lumiere` | carte → | nombre, % | non | 0 |
| `plante/<id>/mesures` | carte → | objet JSON complet | non | 0 |
| `plante/<id>/statut` | carte → | objet JSON | **oui** | 1 |
| `plante/<id>/brut` | carte → | objet JSON des valeurs brutes | non | 0 |
| `plante/<id>/cmd` | → carte | objet JSON de commande | non | 1 |

### Charge utile de `mesures`

```json
{
 "humidite": 42.5,
 "temperature": 21.4,
 "lumiere": 78.0,
 "humidite_air": 55.2,
 "humeur": "heureuse",
 "uptime": 128456,
 "version": "1.0.0"
}
```

### Charge utile de `statut`

Publiée en message **retenu** à la connexion, pour que le prochain abonné
connaisse l'état sans attendre.

```json
{
 "en_ligne": true,
 "nom": "Basilic de Paul",
 "version": "1.0.0",
 "mode": "dual",
 "rssi": -58,
 "ip": "192.168.8.42"
}
```

### Testament (last will)

Enregistré à la connexion sur `plante/<id>/statut`, retenu, garantie 1 :

```json
{"en_ligne": false}
```

C'est le broker qui le publie quand la carte se tait : elle ne peut pas
annoncer elle-même qu'elle a disparu.

### Commandes acceptées sur `cmd`

```json
{"action": "identifier"} // clignote 3 s, pour retrouver sa carte
{"action": "calibrer", "point": "sec"} // enregistre la valeur brute courante
{"action": "calibrer", "point": "humide"}
{"action": "periode", "ms": 5000} // change la période de mesure
{"action": "maj"} // force la recherche de mise à jour
```

---

## 6. Mise à jour à distance (séance 6)

La carte interroge `URL_MANIFESTE` toutes les `PERIODE_MAJ_MS`, une heure par défaut.

```json
{
 "version": "1.1.0",
 "url": "https://exemple/firmware-1.1.0.bin",
 "sha256": "ab12…",
 "hmac": "cd34…",
 "min_version": "1.0.0"
}
```

Trois garde-fous, dans cet ordre :

1. **HMAC-SHA256 du manifeste** avec le secret partagé `CLE_MAJ`. Un manifeste
 qui ne correspond pas est ignoré sans être téléchargé.
2. **SHA-256 du binaire** vérifié pendant l'écriture. En cas d'écart, l'écriture
 est annulée et la carte redémarre sur l'ancienne version.
3. **Signe de vie au démarrage.** Après une mise à jour, la carte doit publier
 son statut dans les 60 secondes. Trois démarrages sans signe de vie et elle
 réinstalle l'URL de repli `url_precedente` mémorisée avant la bascule.

Ce n'est pas une signature asymétrique : un secret partagé suffit au cadre du
module, et la limite se dit en soutenance. Un produit réel signe avec une clé
privée que l'objet ne détient pas.

---

## 7. Modes de fonctionnement

Réglés par `MODE_FIRMWARE` dans `config.h`.

| Mode | Séance | Ce qui tourne |
|---|---|---|
| `MODE_BLE` | 2 | capteurs, écran, annonce BLE |
| `MODE_DUAL` | 3 à 6 | capteurs, écran, BLE **et** WiFi + MQTT |
| `MODE_DEMO` | 7, portes ouvertes | aucun réseau, mesures rejouées, BLE seul |

Le Bluetooth du mode démo n'est pas un oubli : sans lui, la boîte des
portes ouvertes n'aurait rien à montrer sur le téléphone dédié. Ne pas
le retirer.

L'environnement de compilation `simu` fait exception : il reprend le
mode démo sans la radio, et ne sert qu'à produire le binaire du
simulateur Wokwi, qui ne sait pas simuler le Bluetooth. Il ne part
jamais sur du matériel.

En mode démo, la carte génère une journée type en boucle sur `PERIODE_DEMO_MS`
(4 minutes par défaut pour une journée entière), indépendamment des capteurs.
Si un capteur est branché et qu'il bouge, sa valeur prend le dessus : un visiteur
qui met le doigt sur la photorésistance voit l'écran réagir.

---

## 8. Journal série

115200 bauds. Chaque ligne est préfixée pour être filtrable pendant les ateliers.

```
[BOOT] Plante-Demo · firmware 1.0.0 · mode dual
[WIFI] connecte · 192.168.8.42 · rssi -58
[MQTT] connecte · plante/binome-03
[MES ] hum 42.5% · temp 21.4C · lum 78.0% · humeur heureuse
[BLE ] annonce en cours · 0 abonne
[MAJ ] aucune version plus recente
[ERR ] DHT22 muet, valeur precedente conservee
```

---

## 9. Adresses du serveur du cours

Écrites au tableau pendant la séance 3.
Le domaine du module est `plante-hub.sergent.dev`.

| Ce qu'on veut joindre | Adresse | Séance |
|---|---|---|
| Le broker, depuis une carte | `mqtt.<domaine>` sur **8883**, en TLS | 3 |
| Le broker, depuis l'application | `wss://mqtt.<domaine>/mqtt` sur **443** | 3 |
| Node-RED | `https://collecte.<domaine>` | 3 et 4 |
| InfluxDB | `https://base.<domaine>` | 4 |
| Grafana, le mur des plantes | `https://mur.<domaine>` | 4 |
| MobSF, démarré seul par un profil | `https://apk.<domaine>` | 6 |

Un seul port sort vraiment de la machine, le **8883** du broker. Le reste
passe par Caddy en HTTPS sur le 443, sans qu'aucun numéro de port
n'apparaisse dans une URL.

Deux numéros restent utiles à connaître, même si personne ne les tape.
**1883** est le MQTT en clair, réservé au collecteur à l'intérieur du
serveur, et **9001** est le listener WebSocket du broker, celui que Caddy
sert en `wss` sur le 443.

Les valeurs 8083 et 8084 que l'on lit partout sont celles d'EMQX, un
autre broker, et 8884 celle de HiveMQ Cloud : les recopier fait échouer
la connexion de l'application sans message clair.
