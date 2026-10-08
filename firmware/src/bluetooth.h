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
            uint16_t hum = (uint16_t)(m.humidite * 100);
            int16_t temp = (int16_t)(m.temperature * 100);
            uint16_t lum = (uint16_t)(m.lumiere * 100);
                
            cHumidite->setValue((uint8_t*)&hum, 2);
            cTemperature->setValue((uint8_t*)&temp, 2);
            cLumiere->setValue((uint8_t*)&lum, 2);

            if (abonnes > 0) {
                cHumidite->notify();
                cTemperature->notify();
                cLumiere->notify();
            }
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
        NimBLEDevice::startAdvertising(); // relancer l'annonce apres une deconnexion
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
