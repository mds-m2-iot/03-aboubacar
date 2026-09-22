// =====================================================================
//  maj.h · mettre a jour la carte sans la toucher
// =====================================================================
//  Trois garde-fous, dans cet ordre :
//    1. HMAC-SHA256 du manifeste, sinon on ne telecharge meme pas
//    2. SHA-256 du binaire verifie pendant l'ecriture
//    3. signe de vie au demarrage, sinon retour a la version precedente
//
//  Ce n'est pas une signature asymetrique. Un secret partage suffit au
//  cadre du module, et la limite se dit en soutenance : un produit reel
//  signe avec une cle privee que l'objet ne detient pas.
// =====================================================================
#pragma once
#include <Arduino.h>
#include <HTTPClient.h>
#include <Update.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>
#include "config.h"
#include "todo.h"

class MiseAJour {
public:
    void demarrer() {
        prefs.begin("maj", false);
        enAttente = prefs.getBool("attente", false);
        if (enAttente) {
            int rates = prefs.getInt("rates", 0) + 1;
            prefs.putInt("rates", rates);
            Serial.printf("[MAJ ] version en observation · demarrage %d\r\n", rates);
            if (rates > MAX_DEMARRAGES_RATES) {
                Serial.println("[MAJ ] trop de demarrages sans signe de vie · retour arriere");
                String repli = prefs.getString("repli", "");
                prefs.putBool("attente", false);
                prefs.putInt("rates", 0);
                if (repli.length()) installer(repli, "");
            }
        }
        debut = millis();
    }

    // Appele des que la carte a publie son statut : c'est le signe de vie.
    void signeDeVie() {
        if (!enAttente) return;
        enAttente = false;
        prefs.putBool("attente", false);
        prefs.putInt("rates", 0);
        Serial.println("[MAJ ] signe de vie recu · version confirmee");
    }

    void boucle() {
        if (strlen(URL_MANIFESTE) == 0) return;
        if (millis() - dernierControle < PERIODE_MAJ_MS && dernierControle != 0) return;
        dernierControle = millis();
        controler();
    }

    void forcerControle() { dernierControle = 0; }

    void controler() {
        HTTPClient http;
        http.begin(URL_MANIFESTE);
        http.setTimeout(8000);
        int code = http.GET();
        if (code != 200) {
            Serial.printf("[ERR ] manifeste indisponible · %d\r\n", code);
            http.end(); return;
        }
        String corps = http.getString();
        http.end();

        JsonDocument doc;
        if (deserializeJson(doc, corps)) { Serial.println("[ERR ] manifeste illisible"); return; }

        const char* version = doc["version"] | "";
        const char* url     = doc["url"] | "";
        const char* sha     = doc["sha256"] | "";
        const char* hmacRef = doc["hmac"] | "";

        // 1. le manifeste lui-meme doit etre authentique
        String base = String(version) + "|" + url + "|" + sha;
        if (!hmacValide(base, hmacRef)) {
            Serial.println("[ERR ] manifeste non authentifie · ignore");
            return;
        }
        if (String(version) == VERSION_FIRMWARE) {
            Serial.println("[MAJ ] aucune version plus recente");
            return;
        }
        Serial.printf("[MAJ ] version %s disponible\r\n", version);
        prefs.putString("repli", prefs.getString("courante", ""));
        prefs.putString("courante", url);
        installer(String(url), String(sha));
    }

private:
    bool hmacValide(const String& message, const char* attendu) {
        // -------------------------------------------------------------
        //  TODO seance 6 . trou 8 . authentifier le manifeste
        // -------------------------------------------------------------
        //  Tant que ce trou n'est pas comble, la fonction rend false et
        //  la carte refuse toute mise a jour. C'est volontaire : un
        //  manifeste non verifie est un manifeste refuse, jamais un
        //  manifeste accepte par defaut. Le trou 9 est d'ailleurs
        //  inatteignable avant celui-ci.
        //
        //  A ecrire, dans cet ordre :
        //    1. refuser tout de suite si attendu est nul ou ne fait pas
        //       exactement 64 caracteres ;
        //    2. calculer le HMAC-SHA256 du message avec CLE_MAJ comme
        //       secret, via mbedtls_md_hmac ;
        //    3. transformer les 32 octets obtenus en 64 caracteres
        //       hexadecimaux ;
        //    4. comparer sans tenir compte de la casse.
        //
        //  CE QUE CA PROTEGE . le manifeste dit ou telecharger le
        //  prochain firmware. Qui peut le remplacer peut faire installer
        //  n'importe quel binaire sur la carte. Le HMAC prouve qu'il a
        //  ete ecrit par quelqu'un qui connait le secret partage.
        //
        //  LA LIMITE, ET ELLE SE DIT EN SOUTENANCE . un secret partage
        //  n'est pas une signature. Il vit dans la carte, donc quiconque
        //  ouvre la carte peut fabriquer des manifestes valides. Un
        //  produit reel signe avec une cle privee que l'objet ne detient
        //  pas et ne verifie qu'avec la cle publique. Savoir nommer
        //  cette limite vaut mieux que la contourner.
        //
        //  LE PIEGE . comparer deux chaines hexadecimales avec strcmp
        //  marche, mais compare aussi la casse : un manifeste ecrit en
        //  majuscules serait refuse alors qu'il est bon.
        //
        //  MARCHE A SUIVRE
        //     1. Garde en premier : si attendu est nul ou ne fait pas exactement
        //        64 caracteres, rends false. Un HMAC-SHA256 fait 32 octets, donc
        //        64 caracteres hexadecimaux, et toute autre longueur est un
        //        manifeste mal forme.
        //     2. Declare un tableau de 32 uint8_t pour recevoir l'empreinte
        //        calculee.
        //     3. Recupere la description de l'algorithme avec
        //        mbedtls_md_info_from_type et la constante MBEDTLS_MD_SHA256.
        //     4. Appelle mbedtls_md_hmac. Il attend, dans l'ordre : la
        //        description, le secret et sa longueur, le message et sa
        //        longueur, et le tableau de sortie. Le secret est CLE_MAJ.
        //     5. Transforme les 32 octets en 64 caracteres. Un tableau de 65
        //        char, une boucle, et sprintf avec le format %02x. Le zero du
        //        format n'est pas decoratif : sans lui, un octet inferieur a 16
        //        s'ecrirait sur un seul caractere et decalerait toute la suite.
        //     6. Termine la chaine par un zero, puis compare avec strcasecmp et
        //        non strcmp. Rends vrai si la comparaison vaut zero.
        //     7. Supprime le return false qui suit, et l'appel A_ECRIRE.
        // -------------------------------------------------------------
        (void)message; (void)attendu;
        A_ECRIRE(6, 8, "verifier le HMAC-SHA256 du manifeste, dans maj.h");
        return false;
    }

    void installer(const String& url, const String& shaAttendu) {
        HTTPClient http;
        http.begin(url);
        http.setTimeout(20000);
        int code = http.GET();
        if (code != 200) { Serial.printf("[ERR ] binaire indisponible · %d\r\n", code); http.end(); return; }

        int taille = http.getSize();
        if (taille <= 0 || !Update.begin(taille)) {
            Serial.println("[ERR ] place insuffisante pour la mise a jour");
            http.end(); return;
        }

        mbedtls_md_context_t ctx;
        mbedtls_md_init(&ctx);
        mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
        mbedtls_md_starts(&ctx);

        WiFiClient* flux = http.getStreamPtr();
        uint8_t tampon[1024];
        int restant = taille;
        while (restant > 0) {
            int lu = flux->readBytes(tampon, min((int)sizeof(tampon), restant));
            if (lu <= 0) break;
            mbedtls_md_update(&ctx, tampon, lu);
            if (Update.write(tampon, lu) != (size_t)lu) break;
            restant -= lu;
        }
        uint8_t sha[32];
        mbedtls_md_finish(&ctx, sha);
        mbedtls_md_free(&ctx);
        http.end();

        char hex[65];
        for (int i = 0; i < 32; i++) sprintf(hex + i * 2, "%02x", sha[i]);
        hex[64] = 0;

        // -------------------------------------------------------------
        //  TODO seance 6 . trou 9 . verifier le binaire telecharge
        // -------------------------------------------------------------
        //  Le SHA-256 du flux vient d'etre calcule au fil de l'ecriture,
        //  il est dans hex. Le manifeste, lui, annonce l'empreinte
        //  attendue dans shaAttendu.
        //
        //  A ecrire : si shaAttendu fait 64 caracteres et ne correspond
        //  pas a hex, ecrire un message d'erreur, appeler Update.abort()
        //  et sortir sans rien valider.
        //
        //  POURQUOI DEUX CONTROLES . le trou 8 authentifie le manifeste,
        //  celui-ci verifie le contenu. Le premier repond a « qui me
        //  parle », le second a « ce que j'ai recu est-il ce qu'on
        //  m'avait annonce ». Un telechargement peut tres bien etre
        //  coupe au milieu par un WiFi capricieux, sans la moindre
        //  malveillance : sans ce controle, la carte redemarre sur un
        //  firmware tronque et ne revient pas.
        //
        //  LE PIEGE . Update.abort() n'est pas decoratif. Sans lui, la
        //  partition reste marquee comme en cours d'ecriture et la
        //  tentative suivante echoue avec un message qui ne parle pas
        //  du tout du probleme reel.
        //
        //  MARCHE A SUIVRE
        //     1. Ecris un si a deux conditions liees par et : shaAttendu fait
        //        bien 64 caracteres, ET la comparaison avec hex echoue.
        //        L'ordre compte : sans la premiere condition, un manifeste sans
        //        empreinte serait refuse alors qu'on veut le laisser passer.
        //     2. Compare avec strcasecmp, comme au trou 8, et non avec strcmp.
        //     3. Dans le si, affiche un message d'erreur clair sur la console.
        //        C'est lui que le binome lira quand la mise a jour echouera.
        //     4. Toujours dans le si, appelle Update.abort(). Sans lui, la
        //        partition reste marquee comme en cours d'ecriture et la
        //        tentative suivante echoue sur un message qui ne parle pas du
        //        tout du probleme reel.
        //     5. Termine par return, pour ne surtout pas continuer l'installation.
        //     6. Supprime l'appel A_ECRIRE.
        // -------------------------------------------------------------
        A_ECRIRE(6, 9, "comparer l'empreinte SHA-256 du binaire, dans maj.h");
        if (restant > 0 || !Update.end(true)) {
            Serial.printf("[ERR ] mise a jour incomplete · %s\r\n", Update.errorString());
            return;
        }
        // 3. la nouvelle version doit prouver qu'elle tient
        prefs.putBool("attente", true);
        prefs.putInt("rates", 0);
        Serial.println("[MAJ ] installee · redemarrage en observation");
        delay(300);
        ESP.restart();
    }

    Preferences prefs;
    bool enAttente = false;
    unsigned long dernierControle = 0;
    unsigned long debut = 0;
};
