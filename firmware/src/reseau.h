// =====================================================================
//  reseau.h · WiFi, MQTT, testament et message retenu
// =====================================================================
#pragma once
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "capteurs.h"
#include "todo.h"

typedef void (*GestionnaireCommande)(const JsonDocument&);

class Reseau {
public:
    void demarrer(GestionnaireCommande surCommande) {
        rappel = surCommande;
        prefixe = String("plante/") + ID_BINOME;

#if MQTT_TLS
        clientSecurise.setInsecure();   // seance 6 : remplace par un certificat
        mqtt.setClient(clientSecurise);
#else
        mqtt.setClient(clientSimple);
#endif
        mqtt.setServer(MQTT_HOTE, MQTT_PORT);
        mqtt.setBufferSize(512);
        mqtt.setCallback(surMessage);
        instance = this;
        connecterWifi();
    }

    void connecterWifi() {
        if (WiFi.status() == WL_CONNECTED) return;
        Serial.printf("[WIFI] connexion a %s\r\n", WIFI_SSID);
        WiFi.mode(WIFI_STA);
        WiFi.begin(WIFI_SSID, WIFI_MOTDEPASSE);
        unsigned long debut = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - debut < 15000) {
            delay(250); Serial.print(".");
        }
        Serial.println();
        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("[WIFI] connecte · %s · rssi %d\r\n",
                          WiFi.localIP().toString().c_str(), WiFi.RSSI());
        } else {
            // La carte ne sait faire que du 2,4 GHz : un reseau en 5 GHz
            // seul ne sera jamais trouve, et l'erreur est muette.
            Serial.println("[ERR ] WiFi introuvable · verifie le 2,4 GHz");
        }
    }

    bool connecte() { return WiFi.status() == WL_CONNECTED && mqtt.connected(); }

    // Pour l'ecran. Voir les constantes RESEAU_* de config.h : la
    // distinction entre « pas de wifi » et « pas de broker » fait
    // gagner dix minutes de diagnostic par seance.
    int etat() {
        if (WiFi.status() != WL_CONNECTED) return RESEAU_SANS_WIFI;
        if (!mqtt.connected())             return RESEAU_WIFI_SEUL;
        return RESEAU_COMPLET;
    }

    void boucle() {
        if (WiFi.status() != WL_CONNECTED) {
            if (millis() - dernierEssaiWifi > delaiEssai) {
                dernierEssaiWifi = millis();
                connecterWifi();
                // L'intervalle double a chaque echec, puis plafonne :
                // reessayer en boucle vide la carte et sature le broker.
                delaiEssai = min(delaiEssai * 2, 30000UL);
            }
            return;
        }
        if (!mqtt.connected()) {
            if (strlen(MQTT_HOTE) == 0) {
                if (!brokerAnnonce) {
                    brokerAnnonce = true;
                    Serial.println("[MQTT] aucun broker configure · renseigne "
                                   "MQTT_HOTE dans config.h");
                }
                return;
            }
            if (millis() - dernierEssaiMqtt > delaiEssai) {
                dernierEssaiMqtt = millis();
                connecterMqtt();
                // Meme regle que pour le WiFi, et elle manquait ici : sans
                // ce doublement, une carte face a un broker absent le
                // rappelle toutes les deux secondes jusqu'a la fin du
                // cours, et la console devient illisible.
                delaiEssai = min(delaiEssai * 2, 30000UL);
            }
            return;
        }
        delaiEssai = 2000;
        mqtt.loop();
    }

    // PubSubClient rend un code numerique, et lui seul ne dit rien a un
    // binome qui bloque. La phrase qui va avec fait gagner dix minutes.
    static const char* expliquerEtatMqtt(int etat) {
        switch (etat) {
            case -4: return "le broker ne repond pas · hote injoignable ou port filtre";
            case -3: return "connexion perdue en cours de route";
            case -2: return "rien n'ecoute a cette adresse · verifie MQTT_HOTE et MQTT_PORT";
            case -1: return "deconnexion demandee par la carte";
            case  1: return "version du protocole refusee par le broker";
            case  2: return "identifiant de client refuse";
            case  3: return "broker indisponible";
            case  4: return "utilisateur ou mot de passe faux";
            case  5: return "pas autorise sur ce broker";
            default: return "code inconnu";
        }
    }

    void connecterMqtt() {
        String idClient = String(NOM_PLANTE) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
        // -------------------------------------------------------------
        //  TODO seance 3 . trou 6 . le testament et l'abonnement
        // -------------------------------------------------------------
        //  La connexion ci-dessous marche deja. Ce qui manque, ce sont
        //  les trois gestes qui rendent la liaison honnete.
        //
        //  A ecrire :
        //    1. LE TESTAMENT. Passer a mqtt.connect les quatre arguments
        //       supplementaires : le sujet « <prefixe>/statut », une
        //       qualite de service de 1, retain a true, et la charge
        //       {"en_ligne":false}.
        //    2. L'ABONNEMENT. Une fois connecte, s'abonner a
        //       « <prefixe>/cmd » en qualite 1, sinon la carte n'entend
        //       aucune commande.
        //    3. LE STATUT. Appeler publierStatut(true) juste apres.
        //
        //  POURQUOI UN TESTAMENT . une carte debranchee ne peut pas
        //  annoncer sa propre disparition. Le testament est un message
        //  confie au broker a la connexion, qu'il publiera a notre place
        //  le jour ou nous cesserons de repondre. Sans lui, l'appli
        //  affiche indefiniment la derniere mesure recue, comme si tout
        //  allait bien. La panne devient invisible, ce qui est pire que
        //  la panne.
        //
        //  POURQUOI RETAIN . le broker garde le dernier message retenu
        //  de chaque sujet et le sert immediatement a tout nouvel
        //  abonne. Sans retain, une appli qui demarre attend la
        //  prochaine publication pour savoir si la plante est en ligne,
        //  soit deux secondes d'ecran vide, soit une eternite si la
        //  carte est justement eteinte.
        //
        //  LE PIEGE . retain sur les MESURES serait une erreur : un
        //  nouvel abonne recevrait une mesure vieille de trois jours en
        //  croyant qu'elle est fraiche. Retain sur le STATUT, jamais sur
        //  les mesures. C'est la meme distinction que dans
        //  docs/CONTRAT.md, section 6.
        //
        //  LE CONTROLE . abonne-toi a « <prefixe>/statut » avec un
        //  client MQTT, debranche la carte, et regarde arriver
        //  en_ligne:false tout seul au bout de quelques secondes.
        //
        //  MARCHE A SUIVRE
        //     1. Construis le sujet du statut dans une variable String : le
        //        prefixe, puis « /statut ». Tu vas t'en servir deux fois.
        //     2. Ecris la charge utile du testament dans un const char* :
        //        {"en_ligne":false}. Attention aux guillemets a echapper.
        //     3. Ajoute les quatre arguments manquants aux deux appels a
        //        mqtt.connect, dans cet ordre : le sujet du statut, la qualite
        //        de service 1, true pour le message retenu, la charge utile.
        //        Les deux branches du si doivent recevoir le meme traitement.
        //     4. Dans la branche du succes, abonne-toi au sujet des commandes,
        //        « <prefixe>/cmd », en qualite 1. La methode s'appelle
        //        subscribe et attend un const char*, donc pense a c_str().
        //     5. Toujours dans le succes, appelle publierStatut(true). C'est le
        //        pendant vivant du testament.
        //     6. Supprime l'appel A_ECRIRE.
        // -------------------------------------------------------------
        bool ok;
        if (strlen(MQTT_UTILISATEUR) > 0) {
            ok = mqtt.connect(idClient.c_str(), MQTT_UTILISATEUR, MQTT_MOTDEPASSE);
        } else {
            ok = mqtt.connect(idClient.c_str());
        }
        if (ok) {
            Serial.printf("[MQTT] connecte · %s\r\n", prefixe.c_str());
            A_ECRIRE(3, 6, "le testament, le message retenu et l'abonnement aux commandes");
        } else {
            Serial.printf("[ERR ] MQTT refuse · code %d · %s\r\n",
                          mqtt.state(), expliquerEtatMqtt(mqtt.state()));
        }
    }

    void publierMesures(const Mesures& m) {
        if (!mqtt.connected()) return;
        // -------------------------------------------------------------
        //  TODO seance 3 . trou 7 . publier les mesures
        // -------------------------------------------------------------
        //  A ecrire, trois familles de messages. Les noms exacts des
        //  sujets sont dans docs/CONTRAT.md, section 6 : recopie-les
        //  depuis la, ne les invente pas.
        //
        //    1. TROIS NOMBRES SEULS, un par sujet : « /humidite »,
        //       « /temperature » et « /lumiere ». La methode privee
        //       publierNombre s'en charge, elle est deja ecrite.
        //    2. UN OBJET JSON COMPLET sur « /mesures », avec humidite,
        //       temperature, lumiere, humidite_air, humeur, uptime et
        //       version. Utilise arrondi() pour les nombres, et
        //       nomHumeur() pour l'humeur.
        //    3. LES VALEURS BRUTES sur « /brut », humidite et lumiere.
        //       Elles servent a la calibration depuis l'application.
        //
        //  POURQUOI LES DEUX FORMES . le JSON sert a l'application, qui
        //  veut tout d'un coup et de maniere coherente. Les nombres seuls
        //  servent a Node-RED et a Grafana, qui savent tracer une valeur
        //  sans avoir a la sortir d'un objet. C'est deux publics, deux
        //  formats, et ca ne coute presque rien.
        //
        //  LE PIEGE . aucun de ces messages ne doit etre retenu. Passe
        //  false en dernier argument de publish. Une mesure retenue est
        //  servie telle quelle a tout nouvel abonne, meme trois jours
        //  plus tard, et rien dans le message ne dit son age : le mur
        //  des plantes de la seance 4 afficherait des valeurs mortes
        //  avec l'aplomb des valeurs fraiches.
        //
        //  LE CONTROLE . abonne-toi a « plante/<ton-id>/# » et compte
        //  cinq messages toutes les deux secondes.
        //
        //  MARCHE A SUIVRE
        //     1. Garde en premier : si le client MQTT n'est pas connecte, sors.
        //        Publier sur un client deconnecte ne leve aucune erreur et perd
        //        le message en silence.
        //     2. Trois appels a publierNombre, une par mesure, avec les
        //        suffixes « /humidite », « /temperature » et « /lumiere ». Cette
        //        methode privee est deja ecrite pour toi.
        //     3. Declare un JsonDocument et remplis ses sept clefs. Les noms
        //        exacts sont dans docs/CONTRAT.md section 6 : recopie-les
        //        depuis la, ne les invente pas. Utilise arrondi() pour les
        //        nombres et nomHumeur() pour l'humeur.
        //     4. Serialise-le dans une String avec serializeJson, puis publie
        //        sur « <prefixe>/mesures ». Le troisieme argument de publish
        //        est le drapeau retenu : il vaut false, et c'est le point le
        //        plus important de la fonction.
        //     5. Recommence avec un second document pour « <prefixe>/brut »,
        //        qui porte les deux valeurs du convertisseur.
        //     6. Supprime l'appel A_ECRIRE.
        // -------------------------------------------------------------
        (void)m;
        A_ECRIRE(3, 7, "publier les mesures sur les sujets du contrat");
    }

    String jsonStatut(bool enLigne) {
        JsonDocument doc;
        doc["en_ligne"] = enLigne;
        doc["nom"]      = NOM_PLANTE;
        doc["version"]  = VERSION_FIRMWARE;
#if MODE_FIRMWARE == MODE_DEMO
        doc["mode"] = "demo";
#elif MODE_FIRMWARE == MODE_DUAL
        doc["mode"] = "dual";
#else
        doc["mode"] = "ble";
#endif
        doc["rssi"] = WiFi.RSSI();
        doc["ip"]   = WiFi.localIP().toString();
        String s; serializeJson(doc, s);
        return s;
    }

    // Message retenu : le prochain abonne recoit l'etat sans attendre,
    // au lieu d'un ecran vide pendant deux secondes.
    void publierStatut(bool enLigne) {
        if (!mqtt.connected()) return;
        String s = jsonStatut(enLigne);
        mqtt.publish((prefixe + "/statut").c_str(), s.c_str(), true);
    }

    const String& sujetPrefixe() const { return prefixe; }

private:
    static float arrondi(float v) { return roundf(v * 10.0f) / 10.0f; }

    void publierNombre(const char* suffixe, float v) {
        char buf[16]; dtostrf(arrondi(v), 0, 1, buf);
        mqtt.publish((prefixe + suffixe).c_str(), buf, false);
    }

    static void surMessage(char* sujet, byte* charge, unsigned int taille) {
        JsonDocument doc;
        if (deserializeJson(doc, charge, taille)) {
            Serial.println("[ERR ] commande illisible");
            return;
        }
        Serial.printf("[MQTT] commande recue sur %s\r\n", sujet);
        if (instance && instance->rappel) instance->rappel(doc);
    }

    WiFiClient clientSimple;
    WiFiClientSecure clientSecurise;
    PubSubClient mqtt;
    String prefixe;
    GestionnaireCommande rappel = nullptr;
    unsigned long dernierEssaiWifi = 0, dernierEssaiMqtt = 0, delaiEssai = 2000;
    bool brokerAnnonce = false;
    static Reseau* instance;
};

Reseau* Reseau::instance = nullptr;
