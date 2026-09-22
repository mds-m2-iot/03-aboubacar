// =====================================================================
//  capteurs.h · lire les trois capteurs, ou rejouer une journee type
// =====================================================================
#pragma once
#include <Arduino.h>
#include <DHT.h>
#include "config.h"
#include "humeur.h"
#include "todo.h"

struct Mesures {
    float humidite      = 0;   // % du sol, calibre
    float temperature   = 0;   // degres Celsius
    float lumiere       = 0;   // % de luminosite, calibre
    float humiditeAir   = 0;   // % d'humidite de l'air
    int   brutHumidite  = 0;   // valeur du convertisseur, pour la calibration
    int   brutLumiere   = 0;
    bool  dhtValide     = false;
    Humeur humeur       = HEUREUSE;
};

class Capteurs {
public:
    Capteurs() : dht(PIN_DHT, DHT22) {}

    void demarrer() {
        pinMode(PIN_HUMIDITE, INPUT);
        pinMode(PIN_LUMIERE, INPUT);
        analogSetPinAttenuation(PIN_HUMIDITE, ADC_11db);
        analogSetPinAttenuation(PIN_LUMIERE, ADC_11db);
        dht.begin();
        solSec = SOL_SEC;
        solHumide = SOL_HUMIDE;
    }

    int lireMoyenne(uint8_t broche) {
        // -------------------------------------------------------------
        //  TODO seance 2 . trou 1 . lisser la mesure
        // -------------------------------------------------------------
        //  Le trou le plus court du firmware, et le premier a combler :
        //  trois lignes, et le resultat se voit tout de suite.
        //
        //  A ecrire : trois lectures de analogRead sur la meme broche,
        //  separees d'un delay(4), et rendre leur moyenne.
        //
        //  POURQUOI . le convertisseur analogique de l'ESP32 n'est pas
        //  precis. Lis deux fois de suite un capteur parfaitement
        //  immobile et tu obtiens deux valeurs qui different de plusieurs
        //  dizaines d'unites. Sur la console, l'humidite gigote alors de
        //  deux ou trois points en permanence, et l'humeur de la plante
        //  clignote entre deux etats des qu'elle passe pres d'un seuil.
        //
        //  L'EXERCICE . flashe d'abord tel quel, regarde la console
        //  trente secondes, et note l'amplitude du bruit. Ecris ensuite
        //  la moyenne et regarde a nouveau. C'est la meme mesure, le
        //  meme capteur, et deux lectures tres differentes.
        //
        //  A FAIRE SUR LA VRAIE CARTE, ET SEULEMENT LA. Le convertisseur
        //  de Wokwi est parfait : en simulation, le potentiometre rend
        //  toujours exactement la meme valeur, et la moyenne ne change
        //  strictement rien. Le bruit est un defaut du silicium, pas du
        //  programme, et un simulateur ne simule pas les defauts qu'on
        //  ne lui a pas demandes. C'est le seul des dix trous dont
        //  l'effet ne se voit pas en simulation.
        //
        //  LE PIEGE . le delay(4) compte. Trois lectures collees les
        //  unes aux autres tombent dans le meme creux de bruit et
        //  moyennent trois fois la meme erreur.
        //
        //  MARCHE A SUIVRE
        //     1. Declare une somme, de type long et initialisee a zero. Un long
        //        et pas un int : tu vas additionner trois valeurs qui montent a
        //        4095 chacune, et un int de 16 bits deborderait.
        //     2. Ecris une boucle qui tourne trois fois. A chaque tour, ajoute
        //        analogRead(broche) a ta somme, puis appelle delay(4).
        //     3. Rends la somme divisee par 3, transtypee en int. La division
        //        entiere est voulue : on rend une valeur brute du convertisseur,
        //        qui est un entier par nature.
        //     4. Supprime le return analogRead(broche) qui suit, et l'appel
        //        A_ECRIRE juste au dessus.
        // -------------------------------------------------------------
        A_ECRIRE(2, 1, "la moyenne de trois lectures, dans capteurs.h");
        return analogRead(broche);
    }

    Mesures lire() {
        Mesures m;
        m.brutHumidite = lireMoyenne(PIN_HUMIDITE);
        m.brutLumiere  = lireMoyenne(PIN_LUMIERE);
        m.humidite = versPourcentage(m.brutHumidite, solSec, solHumide);
        m.lumiere  = versPourcentage(m.brutLumiere, LUM_SOMBRE, LUM_CLAIR);

        float t = dht.readTemperature();
        float h = dht.readHumidity();
        if (isnan(t) || isnan(h)) {
            // Le DHT22 rate une lecture sur dix, c'est son caractere.
            // On garde la precedente plutot que d'envoyer un trou.
            m.temperature = dernierT;
            m.humiditeAir = dernierH;
            m.dhtValide   = false;
        } else {
            m.temperature = t; m.humiditeAir = h;
            dernierT = t;      dernierH = h;
            m.dhtValide   = true;
        }
        m.humeur = calculerHumeur(m.humidite, SEUIL_BAS, SEUIL_HAUT);
        return m;
    }

    Mesures rejouer(unsigned long maintenant) {
        // -------------------------------------------------------------
        //  TODO seance 7 . trou 10 . rejouer une journee
        // -------------------------------------------------------------
        //  Le mode demonstration fait tenir vingt-quatre heures de vie
        //  d'une plante dans quelques minutes, sans capteur, sans
        //  reseau. C'est ce qui tourne dans la boite des portes
        //  ouvertes, ou personne n'attendra une vraie journee.
        //
        //  A ecrire, dans cet ordre :
        //    1. calculer une phase entre 0 et 1 a partir de maintenant
        //       et de PERIODE_DEMO_MS, puis l'heure simulee ;
        //    2. faire decroitre l'humidite d'environ 78 % a 26 % sur la
        //       periode, c'est la secheresse progressive ;
        //    3. faire osciller la temperature autour de 19 degres et la
        //       lumiere en cloche entre 7h30 et 20h30, nulle la nuit ;
        //    4. borner la lumiere entre 0 et 100 ;
        //    5. calculer l'humeur avec calculerHumeur, comme dans lire().
        //
        //  LE GESTE EN PLUS . lis quand meme les vrais capteurs, et
        //  laisse une mesure reelle reprendre la main quand elle
        //  s'ecarte franchement du scenario, disons de plus de 35
        //  points. Un visiteur qui pose le doigt sur la photoresistance
        //  doit voir l'ecran reagir : c'est ce petit detail qui fait la
        //  difference entre une animation et un objet vivant.
        //
        //  LE PIEGE . la demonstration doit repartir toute seule. Base
        //  la phase sur un modulo de PERIODE_DEMO_MS et non sur un
        //  compteur qui grandit, sinon la plante finit assoiffee au bout
        //  d'un quart d'heure et le reste jusqu'a la fin de la journee
        //  portes ouvertes.
        //
        //  EN ATTENDANT, on lit les vrais capteurs : le mode demo se
        //  comporte comme le mode normal, ce qui est faux mais visible.
        //
        //  MARCHE A SUIVRE
        //     1. Calcule la phase. Prends maintenant modulo PERIODE_DEMO_MS,
        //        divise par PERIODE_DEMO_MS, et transtype les deux en float. Le
        //        modulo est le coeur du trou : il ramene le temps dans une
        //        periode qui recommence.
        //     2. Deduis-en une heure simulee, entre 0 et 24, en multipliant la
        //        phase par 24. Tout le reste s'exprime en fonction de ces deux
        //        nombres.
        //     3. Declare une Mesures et remplis ses champs. L'humidite decroit
        //        lineairement de 78 a 26 pour cent sur la periode. La
        //        temperature oscille autour de 19 degres avec un sinus. La
        //        lumiere suit une cloche entre 7h30 et 20h30 et vaut 3 pour
        //        cent la nuit. Mets dhtValide a true.
        //     4. Ajoute les deux blocs qui laissent le reel reprendre la main :
        //        lis le vrai capteur, convertis-le en pourcentage, et si l'ecart
        //        avec le scenario depasse 35 points, garde la valeur reelle.
        //        C'est ce detail qui fait la difference entre une animation et
        //        un objet vivant.
        //     5. Borne la lumiere entre 0 et 100, calcule l'humeur avec
        //        calculerHumeur, et rends la mesure.
        //     6. Supprime le return lire() qui suit, et l'appel A_ECRIRE.
        // -------------------------------------------------------------
        (void)maintenant;
        A_ECRIRE(7, 10, "rejouer une journee type, dans capteurs.h");
        return lire();
    }

    void calibrerSec(int brut)    { solSec = brut; }
    void calibrerHumide(int brut) { solHumide = brut; }
    int  pointSec() const         { return solSec; }
    int  pointHumide() const      { return solHumide; }

private:
    DHT dht;
    float dernierT = 20.0f;
    float dernierH = 50.0f;
    int solSec = SOL_SEC;
    int solHumide = SOL_HUMIDE;
};
