// =====================================================================
//  bluetooth.h · l'objet annonce, le telephone ecoute
// =====================================================================
//  Un service, quatre caracteristiques. Les UUID sont dans docs/CONTRAT.md
//  et sont recopies tels quels dans l'application.
// =====================================================================
#pragma once
#include <NimBLEDevice.h>
#include "config.h"
#include "capteurs.h"
#include "todo.h"

#define UUID_SERVICE      "6d5a0001-9b7d-4c2a-8f10-2b1e5a7c3d40"
#define UUID_HUMIDITE     "6d5a0002-9b7d-4c2a-8f10-2b1e5a7c3d40"
#define UUID_TEMPERATURE  "6d5a0003-9b7d-4c2a-8f10-2b1e5a7c3d40"
#define UUID_LUMIERE      "6d5a0004-9b7d-4c2a-8f10-2b1e5a7c3d40"
#define UUID_STATUT       "6d5a0005-9b7d-4c2a-8f10-2b1e5a7c3d40"

class Bluetooth : public NimBLEServerCallbacks {
public:
    void demarrer() {
        NimBLEDevice::init(NOM_PLANTE);
        NimBLEDevice::setPower(ESP_PWR_LVL_P9);
        serveur = NimBLEDevice::createServer();
        serveur->setCallbacks(this);

        NimBLEService* service = serveur->createService(UUID_SERVICE);
        cHumidite    = service->createCharacteristic(UUID_HUMIDITE,
                        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
        cTemperature = service->createCharacteristic(UUID_TEMPERATURE,
                        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
        cLumiere     = service->createCharacteristic(UUID_LUMIERE,
                        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
        cStatut      = service->createCharacteristic(UUID_STATUT,
                        NIMBLE_PROPERTY::READ);
        service->start();

        NimBLEAdvertising* pub = NimBLEDevice::getAdvertising();
        pub->addServiceUUID(UUID_SERVICE);
        pub->setScanResponse(true);
        // Tant que l'annonce ne tourne pas, aucun scan ne trouve quoi que
        // ce soit, et l'application n'a aucune erreur a afficher.
        pub->start();
        Serial.println("[BLE ] annonce demarree");
    }

    void publier(const Mesures& m) {
        if (!cHumidite) return;
        // -------------------------------------------------------------
        //  TODO seance 2 . trou 4 . envoyer les mesures au telephone
        // -------------------------------------------------------------
        //  A ecrire, dans cet ordre :
        //    1. convertir chaque mesure en entier, en la multipliant par
        //       100 : humidite et lumiere en uint16_t, temperature en
        //       int16_t parce qu'elle peut etre negative ;
        //    2. poser chaque valeur dans sa caracteristique avec
        //       setValue, sur deux octets ;
        //    3. si au moins un abonne ecoute, appeler notify() sur les
        //       trois.
        //
        //  POURQUOI DES ENTIERS . une caracteristique BLE transporte des
        //  octets, pas des nombres. Envoyer un float tel quel marcherait
        //  entre deux machines identiques et casserait ailleurs, parce
        //  que rien ne garantit la meme representation des deux cotes.
        //  On envoie donc un entier et un facteur connu, ecrit dans
        //  docs/CONTRAT.md. Cote application, tu diviseras par 100.
        //
        //  LE PIEGE . setValue sans notify remplit la valeur mais ne
        //  previent personne. Le telephone la verra s'il relit la
        //  caracteristique, et seulement a ce moment : l'ecran restera
        //  fige sur la premiere mesure, ce qui ressemble beaucoup a un
        //  capteur en panne. Les deux appels vont ensemble.
        //
        //  LE CONTROLE . nRF Connect sur ton telephone, ou l'appli
        //  quand elle saura scanner. Les trois valeurs bougent quand tu
        //  souffles sur le capteur ou que tu masques la lumiere.
        //
        //  MARCHE A SUIVRE
        //     1. Garde de demarrage en premier. Si cHumidite est nul, sors de la
        //        fonction. En mode simulation la radio n'est pas allumee et les
        //        caracteristiques n'existent pas : sans cette ligne le premier
        //        appel dereference un pointeur nul et la carte plante.
        //     2. Convertis les trois mesures en entiers. Multiplie par 100 et
        //        transtype. L'humidite et la lumiere tiennent dans un uint16_t
        //        puisqu'elles vont de 0 a 10000 ; la temperature demande un
        //        int16_t parce qu'elle peut etre negative.
        //     3. Pose chaque valeur dans sa caracteristique avec setValue. La
        //        methode attend une adresse d'octets et une longueur : passe
        //        l'adresse de ta variable transtypee en (uint8_t*), et 2.
        //     4. Notifie, mais seulement si abonnes est superieur a zero.
        //        Notifier sans abonne ne casse rien mais travaille pour
        //        personne.
        //     5. Supprime l'appel A_ECRIRE.
        // -------------------------------------------------------------
        (void)m;
        A_ECRIRE(2, 4, "remplir et notifier les caracteristiques, dans bluetooth.h");
    }

    void majStatut(const String& json) { if (cStatut) cStatut->setValue(json.c_str()); }

    // NimBLEServerCallbacks
    void onConnect(NimBLEServer*) override {
        abonnes++;
        Serial.printf("[BLE ] connexion · %d abonne(s)\r\n", abonnes);
    }
    void onDisconnect(NimBLEServer*) override {
        if (abonnes > 0) abonnes--;
        Serial.printf("[BLE ] deconnexion · %d abonne(s)\r\n", abonnes);
        // -------------------------------------------------------------
        //  TODO seance 2 . trou 5 . se rendre a nouveau visible
        // -------------------------------------------------------------
        //  Une seule ligne a ecrire. C'est la panne numero un de la
        //  seance 2, et celle qui coute le plus de temps a ceux qui ne
        //  la connaissent pas.
        //
        //  CE QUI SE PASSE SANS ELLE . une carte qui accepte une
        //  connexion arrete d'annoncer sa presence, c'est le
        //  fonctionnement normal du BLE. Quand le telephone se
        //  deconnecte, plus personne n'annonce rien : la carte est
        //  toujours allumee, la console affiche toujours ses mesures,
        //  l'ecran fonctionne, et pourtant aucun scan ne la trouve plus.
        //  Tout va bien, sauf qu'elle est devenue invisible.
        //
        //  Le symptome est trompeur au point qu'on soupconne d'abord le
        //  telephone, puis l'application, puis le cable. Rappelle-toi
        //  juste que ca marche une fois et une seule : c'est la
        //  signature de ce trou-la.
        //
        //  A ecrire : relancer l'annonce, avec la methode statique de
        //  NimBLEDevice.
        //
        //  MARCHE A SUIVRE
        //     1. Decremente le compteur d'abonnes, avec une garde : ne descends
        //        pas en dessous de zero. Une deconnexion peut arriver sans
        //        connexion prealable dans certains cas de reprise, et un
        //        compteur negatif fausserait le test du trou 4.
        //     2. Affiche une ligne sur la console avec le nouveau compte. Elle
        //        te servira a comprendre ce qui se passe pendant le TP.
        //     3. Relance l'annonce. Une seule ligne, et c'est tout le trou. La
        //        methode est statique : elle s'adresse a la pile Bluetooth et
        //        non a un objet, donc elle s'appelle avec le nom de la classe
        //        NimBLEDevice suivi de deux fois deux points.
        //     4. Supprime l'appel A_ECRIRE.
        // -------------------------------------------------------------
        A_ECRIRE(2, 5, "relancer l'annonce apres une deconnexion, dans bluetooth.h");
    }

    int nbAbonnes() const { return abonnes; }

private:
    NimBLEServer* serveur = nullptr;
    NimBLECharacteristic* cHumidite = nullptr;
    NimBLECharacteristic* cTemperature = nullptr;
    NimBLECharacteristic* cLumiere = nullptr;
    NimBLECharacteristic* cStatut = nullptr;
    int abonnes = 0;
};
