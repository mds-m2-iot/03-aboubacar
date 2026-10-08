// =====================================================================
//  config.h · le seul fichier que tu modifies en seance 2 et en seance 3
// =====================================================================
//  Tout ce qui suit se change sans toucher au reste du firmware.
//  Chaque binome a sa propre copie de ce fichier, et lui seul.
// =====================================================================
#pragma once

// ---------------------------------------------------------------- mode
// MODE_BLE   seance 2 · capteurs + ecran + annonce Bluetooth
// MODE_DUAL  seances 3 a 6 · en plus, WiFi et MQTT
// MODE_DEMO  seance 7 et portes ouvertes · aucun reseau, mesures rejouees
#define MODE_BLE   0
#define MODE_DUAL  1
#define MODE_DEMO  2

// Le mode se change ICI, c'est le reglage le plus structurant du fichier.
//
// La valeur par defaut est MODE_BLE, et ce choix se justifie. C'est le
// mode de la seance 2, celui par lequel tout le monde commence, et le
// seul qui fonctionne sans le reseau de la salle. Une carte flashee en
// MODE_DUAL hors de la salle passe quinze secondes a chercher un WiFi
// absent avant d'abandonner, ce qui ressemble beaucoup a une panne
// quand on ne s'y attend pas.
//
// Le garde #ifndef permet de compiler un mode precis sans toucher a
// cette ligne, ce qui est utile pour verifier que les quatre compilent :
//     pio run -e ble    pio run -e dual    pio run -e demo
#ifndef MODE_FIRMWARE
  #define MODE_FIRMWARE MODE_DUAL
#endif

// ------------------------------------------------------- etat reseau
// Ce que l'ecran affiche en bas a gauche. Trois etats plutot que deux,
// et la nuance vaut la ligne de code qu'elle coute : devant vingt
// binomes, « hors ligne » ne dit pas quelle moitie de la chaine est
// cassee. Savoir que le WiFi tient mais que le broker manque oriente
// tout de suite vers config.h plutot que vers le routeur.
#define RESEAU_ABSENT     0   // mode sans reseau, seances 2 et 7
#define RESEAU_SANS_WIFI  1   // le WiFi n'est pas trouve
#define RESEAU_WIFI_SEUL  2   // WiFi ok, broker injoignable
#define RESEAU_COMPLET    3   // les deux

// -------------------------------------------------------------- plante
// Le nom annonce en Bluetooth. Deux binomes cote a cote ne doivent pas
// avoir le meme, sinon personne ne sait quelle plante il connecte.
#define NOM_PLANTE "Aboubacar"

// Seuils de confort de l'espece, repris de la fiche d'identite de la plante.
#define SEUIL_BAS   30    // en dessous, elle a soif
#define SEUIL_HAUT  70    // au dessus, elle a trop bu

// --------------------------------------------------------- calibration
// Mesures faites capteur a l'air libre, puis dans un verre d'eau.
// Le capteur capacitif renvoie une valeur qui BAISSE quand l'humidite monte.
#define SOL_SEC     3220
#define SOL_HUMIDE  980

// Le module de lumiere se comporte pareil : sombre = valeur haute.
//
// LUM_CLAIR n'est PAS le maximum que le capteur sache lire. Oriente vers
// une fenetre il descend a 0, et calibrer la-dessus donnerait 40 % sur
// une table ordinaire, ce que personne ne comprendrait. La bonne borne
// est le plus lumineux qu'il verra dans les conditions du cours :
// photoresistance a plat sur la table, tournee vers le plafond.
//
// Mesures du 25/08/2026 : main dessus 4030, table en eclairage normal
// 70 a 120, fenetre en face 0. D'ou 60, choisi juste en dessous de la
// table pour que l'affichage n'y soit pas ecrase a 100 % en permanence,
// et un 100 % franc des qu'on approche une vraie source de lumiere.
//
// Ne pas esperer beaucoup mieux en jouant sur cette seule borne. Une
// photoresistance repond de facon logarithmique et on lui plaque une
// echelle lineaire : le haut de la plage se tasse pres de 100 % quoi
// qu'on fasse. Le vrai levier serait LUM_SOMBRE, qu'on pourrait
// descendre vers 2000 pour etaler la plage utile en salle. On ne le fait
// pas, et c'est un choix : a 4030, poser la main sur le capteur fait
// parcourir toute l'echelle de 100 a 0, et ce geste est la demonstration
// que les binomes refont dix fois. Un affichage vivant sous la main vaut
// mieux qu'un affichage vivant au repos.
//
// Le brut est la verite, le pourcentage est une convention. C'est pour
// cela que le contrat publie aussi /brut, et c'est ce qui rend la
// calibration interessante a faire faire plutot qu'a donner.
#define LUM_SOMBRE  4030
#define LUM_CLAIR   60

// ------------------------------------------------------------- broches
// Ne changent pas : elles sont figees par la fiche de cablage.
// Les deux entrees analogiques restent sur l'ADC1 (GPIO32 a GPIO39),
// le seul convertisseur qui reste utilisable quand le WiFi est allume.
#define PIN_HUMIDITE  34
#define PIN_LUMIERE   35
#define PIN_DHT       25
#define PIN_SDA       21
#define PIN_SCL       22
#define PIN_LED        2   // LED bleue de la carte, temoin de vie

#define ECRAN_PRESENT     1
#define ECRAN_ADRESSE     0x3C
// Seconde adresse essayee si la premiere ne repond pas. Les modules du
// meme lot ne sont pas tous configures pareil, c'est un piege classique.
#define ECRAN_ADRESSE_BIS 0x3D
#define ECRAN_LARGEUR     128
#define ECRAN_HAUTEUR     64

// -------------------------------------------------------------- rythme
#define PERIODE_MESURE_MS   2000     // une mesure toutes les 2 s
#define PERIODE_ECRAN_MS    1000
#define PERIODE_DEMO_MS   240000     // une journee type rejouee en 4 min

// --------------------------------------------------------------- reseau
// Utilises uniquement en MODE_DUAL. Le reseau du projet est un WiFi dedie
// en 2,4 GHz : l'ESP32 ne sait pas faire de 5 GHz.
#define WIFI_SSID      "plante-lab"
#define WIFI_MOTDEPASSE "plante2026"

// Le broker du module vit sur un serveur en ligne : il est joignable de
// la salle comme de chez soi, depuis la 4G d'un telephone et de chez soi
// le soir, et personne n'a de conteneur a installer. Le deploiement
// complet est decrit dans docs/DEPLOIEMENT-VPS.md.
//
// MQTT_HOTE vide, la carte se connecte au WiFi et le dit une fois, sans
// harceler un broker qui n'existe pas. L'ecran affiche alors
// « sans broker », ce qui distingue ce cas d'une absence de WiFi.
//
// Pour l'environnement simu-reseau du simulateur Wokwi, rien ne change :
// meme hote, meme port et meme compte que sur le kit reel. La simulation
// n'est pas un montage a part, c'est le meme chemin avec une carte
// virtuelle, et une plante simulee apparait sur le mur des plantes
// comme une vraie. Le mot de passe se colle au moment de la
// manipulation et ne revient pas dans le depot.
#define MQTT_HOTE      "mqtt.plante-hub.sergent.dev"
#define MQTT_PORT      8883
#define MQTT_UTILISATEUR "classe"
#define MQTT_MOTDEPASSE  "Plante2026MQTT"
#define MQTT_TLS       1             // 0 pour un broker local en clair

// UN MOT SUR CE MOT DE PASSE, ET IL VAUT UNE MINUTE DE COURS.
//
// Il est ecrit ici, donc dans un fichier versionne, alors que tout le
// reste du module repete qu'un secret ne va jamais dans Git. La
// contradiction est apparente, et l'expliquer vaut mieux que la cacher.
//
// Un firmware n'a pas de fichier .env : ce qu'il doit savoir, il le
// porte. Et meme si on le lisait ailleurs, il finirait compile dans le
// binaire, ou n'importe qui sachant lire une memoire flash le
// retrouverait. On ne peut pas cacher un secret dans un objet qu'on
// remet a quelqu'un. C'est exactement la limite que le trou 8 de la
// seance 6 fait nommer a voix haute a propos de CLE_MAJ.
//
// Ce qui rend la chose acceptable ici tient en trois points : c'est un
// compte de classe et non un compte personnel, il est ecrit au tableau
// de toute facon, et il change a chaque promotion. Ce n'est pas un
// secret, c'est une convention partagee. Un vrai systeme donnerait un
// certificat par appareil, revocable un par un.

// Le prefixe de sujet du binome. C'est le seul reglage qui doit etre
// different d'un binome a l'autre, sinon les mesures se melangent
// sans erreur et personne ne s'en apercoit avant les courbes.
#define ID_BINOME      "binome-03"

// ------------------------------------------------------- mise a jour
// Renseigne en seance 6. Laisse vide, la carte ne cherche jamais de mise a jour.
#define URL_MANIFESTE   ""
#define CLE_MAJ         "change-moi-en-seance-6"
#define PERIODE_MAJ_MS  3600000UL    // une heure
#define DELAI_SIGNE_VIE_MS 60000UL   // 60 s pour prouver que la maj tient
#define MAX_DEMARRAGES_RATES 3
