// =====================================================================
//  Ma plante connectee · firmware de reference
//  Module M2 Applications mobiles et connectees (IoT) · Sergent.dev
// =====================================================================
//  Trois blocs, et rien d'autre :
//    setup()  initialise les capteurs et demarre l'annonce
//    loop()   lit les trois capteurs toutes les deux secondes
//    publier() pousse les valeurs vers les abonnes, Bluetooth et reseau
//
//  Tu ne l'ecris pas : tu le lis, tu le flashes, et tu changes une
//  constante de config.h pour voir l'effet.
// =====================================================================
#include <Arduino.h>
#include "config.h"
#include "capteurs.h"
#include "bluetooth.h"

// ---------------------------------------------------------------------
//  SANS_RADIO · compiler le firmware sans allumer la radio
// ---------------------------------------------------------------------
//  Les trois modes du module allument tous le Bluetooth, y compris le
//  mode demo : le contrat le prevoit, c'est ce qui permet au telephone
//  dedie des portes ouvertes d'afficher la plante sans serveur, sans
//  reseau et sans compte.
//
//  Un simulateur, lui, ne sait pas simuler une radio. La pile cherche
//  alors un controleur qui n'existe pas, la tache btController ne rend
//  jamais la main, et le chien de garde abat le systeme au bout d'une
//  dizaine de secondes. La carte redemarre en boucle.
//
//  Ce drapeau existe donc pour un seul usage : l'environnement « simu »
//  de platformio.ini, qui produit le binaire destine a Wokwi. Il ne
//  change rien aux trois modes livres sur le vrai materiel.
// ---------------------------------------------------------------------
#ifndef SANS_RADIO
#define SANS_RADIO 0
#endif
#include "ecran.h"
#if MODE_FIRMWARE == MODE_DUAL
  #include "reseau.h"
  #include "maj.h"
#endif

Capteurs capteurs;
Bluetooth bluetooth;
Ecran ecran;
#if MODE_FIRMWARE == MODE_DUAL
Reseau reseau;
MiseAJour maj;
#endif

Mesures derniere;
unsigned long tMesure = 0, tEcran = 0, tClignote = 0;
bool identification = false;
unsigned long finIdentification = 0;

// ------------------------------------------------- commandes recues
#if MODE_FIRMWARE == MODE_DUAL
void surCommande(const JsonDocument& doc) {
    const char* action = doc["action"] | "";
    if (!strcmp(action, "identifier")) {
        identification = true;
        finIdentification = millis() + 3000;
        Serial.println("[CMD ] identification · la LED clignote 3 s");
    } else if (!strcmp(action, "calibrer")) {
        const char* point = doc["point"] | "";
        if (!strcmp(point, "sec")) {
            capteurs.calibrerSec(derniere.brutHumidite);
            Serial.printf("[CMD ] point sec enregistre a %d\r\n", derniere.brutHumidite);
        } else if (!strcmp(point, "humide")) {
            capteurs.calibrerHumide(derniere.brutHumidite);
            Serial.printf("[CMD ] point humide enregistre a %d\r\n", derniere.brutHumidite);
        }
    } else if (!strcmp(action, "maj")) {
        maj.forcerControle();
        Serial.println("[CMD ] recherche de mise a jour forcee");
    } else {
        Serial.printf("[CMD ] action inconnue · %s\r\n", action);
    }
}
#endif

// ------------------------------------------------------------ setup
void setup() {
    Serial.begin(115200);
    delay(400);
    pinMode(PIN_LED, OUTPUT);

    const char* nomMode =
#if MODE_FIRMWARE == MODE_DEMO
        "demo";
#elif MODE_FIRMWARE == MODE_DUAL
        "dual";
#else
        "ble";
#endif
    Serial.printf("\r\n[BOOT] %s · firmware %s · mode %s\r\n", NOM_PLANTE, VERSION_FIRMWARE, nomMode);

    capteurs.demarrer();
    ecran.demarrer();
#if !SANS_RADIO
    bluetooth.demarrer();
#endif

#if MODE_FIRMWARE == MODE_DUAL
    maj.demarrer();
    reseau.demarrer(surCommande);
#endif
    Serial.println("[BOOT] pret");
}

// ------------------------------------------------------------- loop
void loop() {
    unsigned long maintenant = millis();

#if MODE_FIRMWARE == MODE_DUAL
    reseau.boucle();
    maj.boucle();
#endif

    if (maintenant - tMesure >= PERIODE_MESURE_MS) {
        tMesure = maintenant;
#if MODE_FIRMWARE == MODE_DEMO
        derniere = capteurs.rejouer(maintenant);
#else
        derniere = capteurs.lire();
#endif
        // Les valeurs brutes du convertisseur sont affichees a cote des
        // pourcentages : ce sont elles qu'on releve pour calibrer, capteur
        // a l'air libre puis dans un verre d'eau. Sans elles sur la
        // console, il faudrait ouvrir un client MQTT pour les lire.
        Serial.printf("[MES ] hum %.1f%% (brut %4d) · temp %.1fC · lum %.1f%% (brut %4d) · humeur %s\r\n",
                      derniere.humidite, derniere.brutHumidite,
                      derniere.temperature,
                      derniere.lumiere, derniere.brutLumiere,
                      nomHumeur(derniere.humeur));
        if (!derniere.dhtValide) Serial.println("[ERR ] DHT22 muet, valeur precedente conservee");

#if !SANS_RADIO
        bluetooth.publier(derniere);
#endif
#if MODE_FIRMWARE == MODE_DUAL
        bluetooth.majStatut(reseau.jsonStatut(true));
        if (reseau.connecte()) {
            reseau.publierMesures(derniere);
            maj.signeDeVie();   // la carte prouve que la version tient
        }
#endif
    }

    if (maintenant - tEcran >= PERIODE_ECRAN_MS) {
        tEcran = maintenant;
        int etatReseau = RESEAU_ABSENT;
#if MODE_FIRMWARE == MODE_DUAL
        etatReseau = reseau.etat();
#endif
        ecran.afficher(derniere, etatReseau, bluetooth.nbAbonnes());
    }

    // Temoin de vie : un battement lent quand tout va bien, rapide
    // pendant les trois secondes qui suivent une demande d'identification.
    unsigned long battement = identification ? 120 : 1500;
    if (maintenant - tClignote >= battement) {
        tClignote = maintenant;
        digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    }
    if (identification && maintenant > finIdentification) {
        identification = false;
        digitalWrite(PIN_LED, LOW);
    }

    delay(10);
}
