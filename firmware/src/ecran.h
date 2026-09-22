// =====================================================================
//  ecran.h · l'humeur affichee sur le pot
// =====================================================================
//  L'ecran est optionnel : si le module n'est pas branche, le firmware
//  continue sans lui. C'est verifie au demarrage, pas suppose.
// =====================================================================
#pragma once
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"
#include "capteurs.h"

class Ecran {
public:
    void demarrer() {
#if ECRAN_PRESENT
        Wire.begin(PIN_SDA, PIN_SCL);

        // ------------------------------------------------------------
        //  On sonde le bus nous-memes, et il y a une bonne raison.
        // ------------------------------------------------------------
        //  Adafruit_SSD1306::begin() ne verifie pas que l'ecran repond.
        //  Il rend false uniquement quand l'allocation du tampon echoue,
        //  puis envoie sa sequence d'initialisation dans le vide sans
        //  jamais lire l'acquittement. Autrement dit il rend true meme
        //  quand aucun module n'est branche.
        //
        //  Deux consequences, et les deux coutent cher en seance. La
        //  premiere adresse essayee reussit toujours, donc la seconde
        //  n'est jamais tentee : un module configure en 0x3D restait
        //  introuvable malgre le code prevu pour lui. Et un ecran mort
        //  ne se distinguait pas d'un ecran absent, puisque le message
        //  d'erreur ne pouvait pas sortir.
        //
        //  Une transmission vide vers l'adresse, et endTransmission qui
        //  rend 0, suffisent a savoir si quelqu'un est la. C'est ce que
        //  fait n'importe quel scanner I2C.
        const uint8_t candidates[] = { ECRAN_ADRESSE, ECRAN_ADRESSE_BIS };
        uint8_t adresse = 0;
        for (uint8_t i = 0; i < sizeof(candidates); i++) {
            Wire.beginTransmission(candidates[i]);
            if (Wire.endTransmission() == 0) { adresse = candidates[i]; break; }
        }

        if (!adresse) {
            Serial.println("[ERR ] aucun ecran aux adresses 0x3C et 0x3D");
            // Le scan complet dit si le bus est mort ou si le module
            // repond ailleurs. Sans lui, on ne sait pas lequel des deux.
            int trouves = 0;
            for (uint8_t a = 0x08; a < 0x78; a++) {
                Wire.beginTransmission(a);
                if (Wire.endTransmission() == 0) {
                    Serial.printf("       un composant repond a 0x%02X\r\n", a);
                    trouves++;
                }
            }
            if (!trouves) {
                Serial.println("       le bus est muet · verifier SDA sur GPIO21,");
                Serial.println("       SCL sur GPIO22, et l'alimentation du module");
            }
            Serial.println("       on continue sans ecran");
            return;
        }

        // periphBegin a false : sans cela la bibliotheque rappelle
        // Wire.begin() sans arguments et remet les broches par defaut,
        // ce qui casserait un cablage sur d'autres broches que 21 et 22.
        present = ecran.begin(SSD1306_SWITCHCAPVCC, adresse, false, false);
        if (!present) {
            Serial.println("[ERR ] memoire insuffisante pour le tampon de l'ecran");
            return;
        }

        //  L'adresse et la geometrie sont annoncees meme quand tout va
        //  bien, parce qu'un module peut repondre et rester noir. Deux
        //  causes, toutes deux frequentes sur les lots bon marche. Un
        //  module 128x32, souvent au format 0,91 pouce, repond a la meme
        //  adresse qu'un 128x64 : corriger ECRAN_HAUTEUR suffit. Un
        //  controleur SH1106, tres repandu en 1,3 pouce, repond lui
        //  aussi a 0x3C mais n'a pas le meme jeu de commandes et demande
        //  la bibliotheque Adafruit_SH110X.
        Serial.printf("[ECR ] repond a 0x%02X · le firmware attend un %dx%d\r\n",
                      adresse, ECRAN_LARGEUR, ECRAN_HAUTEUR);
        ecran.clearDisplay();
        ecran.setTextColor(SSD1306_WHITE);
        ecran.setTextSize(1);
        ecran.setCursor(0, 0);
        ecran.println(NOM_PLANTE);
        ecran.println(VERSION_FIRMWARE);
        ecran.display();
#endif
    }

    // Le libelle de l'etat reseau. Douze caracteres au maximum : la
    // police fait six pixels de large et le compteur BLE commence a
    // l'abscisse 78.
    static const char* libelleReseau(int etat) {
        switch (etat) {
            case RESEAU_SANS_WIFI: return "pas de wifi";
            case RESEAU_WIFI_SEUL: return "sans broker";
            case RESEAU_COMPLET:   return "reseau ok";
            default:               return "hors ligne";
        }
    }

    void afficher(const Mesures& m, int etatReseau, int abonnes) {
        if (!present) return;
        ecran.clearDisplay();

        ecran.setTextSize(1);
        ecran.setCursor(0, 0);
        ecran.print(NOM_PLANTE);

        ecran.setCursor(0, 14);
        ecran.setTextSize(2);
        ecran.print((int)m.humidite);
        ecran.print("%");

        ecran.setTextSize(1);
        ecran.setCursor(64, 14);
        ecran.print(m.temperature, 1);
        ecran.print("C");
        ecran.setCursor(64, 24);
        ecran.print((int)m.lumiere);
        ecran.print("% lum");

        ecran.setCursor(0, 40);
        ecran.print(messageHumeur(m.humeur));

        ecran.setCursor(0, 54);
        ecran.print(libelleReseau(etatReseau));
        ecran.setCursor(78, 54);
        ecran.print("BLE ");
        ecran.print(abonnes);

        ecran.display();
    }

    void message(const char* texte) {
        if (!present) return;
        ecran.clearDisplay();
        ecran.setTextSize(1);
        ecran.setCursor(0, 28);
        ecran.print(texte);
        ecran.display();
    }

    bool disponible() const { return present; }

private:
    Adafruit_SSD1306 ecran{ECRAN_LARGEUR, ECRAN_HAUTEUR, &Wire, -1};
    bool present = false;
};
