// =====================================================================
//  humeur.h · traduire une mesure en information utile
// =====================================================================
//  La meme logique existe en TypeScript dans app/lib/humeur.ts.
//  Les deux sont testees sur les memes bornes : si tu changes ici,
//  change la-bas, et fais tourner le test de la seance 6.
// =====================================================================
#pragma once
#include <Arduino.h>
#include "todo.h"

enum Humeur { NOYEE, REPUT, HEUREUSE, SOIF, ASSOIFFEE };

inline Humeur calculerHumeur(float humidite, int seuilBas, int seuilHaut) {
    // -----------------------------------------------------------------
    //  TODO seance 2 . trou 3 . les cinq humeurs
    // -----------------------------------------------------------------
    //  A ecrire, cinq tests qui rendent chacun une valeur de l'enum :
    //    1. au-dessus de seuilHaut + 15  . NOYEE
    //    2. au-dessus de seuilHaut       . REPUT
    //    3. en dessous de seuilBas - 15  . ASSOIFFEE
    //    4. en dessous de seuilBas       . SOIF
    //    5. entre les deux               . HEUREUSE
    //
    //  LE PIEGE . l'ordre des tests n'est pas decoratif. Ecris
    //  « humidite > seuilHaut » avant « humidite > seuilHaut + 15 » et
    //  le premier attrape tout : la plante ne sera jamais noyee, et rien
    //  ne te le signalera. Les deux bornes extremes se testent d'abord,
    //  toujours. C'est vrai de toute cascade de seuils.
    //
    //  LE CONTROLE . la meme fonction existe en TypeScript dans ton
    //  application. Les bornes exactes sont dans docs/CONTRAT.md,
    //  section 4, et le test de la seance 6 compare les deux sur toute
    //  la plage. Une difference d'un seul « >= » se voit la.
    //
    //  MARCHE A SUIVRE
    //     1. Note les cinq humeurs sur un papier, dans l'ordre de l'humidite
    //        croissante : ASSOIFFEE, SOIF, HEUREUSE, REPUT, NOYEE.
    //     2. Place les quatre frontieres entre elles. Deux viennent des
    //        seuils, deux viennent des seuils plus ou moins MARGE_EXTREME.
    //     3. Ecris les tests du plus extreme vers le moins extreme. Le
    //        premier teste le cas le plus rare, le dernier le plus courant.
    //        Si tu testes seuilHaut avant seuilHaut plus la marge, le
    //        premier attrape tout et la plante n'est jamais noyee.
    //     4. Termine par un return sans test pour HEUREUSE : tout ce qui
    //        n'est tombe dans aucun cas extreme est, par construction,
    //        entre les deux seuils.
    //     5. Supprime le return HEUREUSE qui suit deja.
    // -----------------------------------------------------------------

    if (humidite > seuilHaut + 15) return NOYEE;
    if (humidite > seuilHaut) return REPUT;
    if (humidite < seuilBas - 15) return ASSOIFFEE;
    if (humidite < seuilBas) return SOIF;
    return HEUREUSE;

}

inline const char* nomHumeur(Humeur h) {
    switch (h) {
        case NOYEE:     return "noyee";
        case REPUT:     return "reput";
        case SOIF:      return "soif";
        case ASSOIFFEE: return "assoiffee";
        default:        return "heureuse";
    }
}


inline const char* messageHumeur(Humeur h) {
    switch (h) {
        case NOYEE:     return "Je suis toute mouillee";
        case REPUT:     return "Je suis pleine";
        case SOIF:      return "J'ai soif";
        case ASSOIFFEE: return "Au secours, de l'eau";
        default:        return "Tout va bien, merci";
    }
}


// Conversion d'une valeur brute du convertisseur en pourcentage.
// Les deux capteurs du kit renvoient une valeur qui BAISSE quand la
// grandeur mesuree monte : c'est contre-intuitif, et c'est normal.
inline float versPourcentage(int brut, int borneBasse, int borneHaute) {
    if (borneBasse == borneHaute) return 0.0f; // eviter une division par zero
    float pourcentage = (float)(borneBasse - brut) * 100.0f / (float)(borneBasse - borneHaute);
    if (pourcentage < 0.0f) pourcentage = 0.0f;
    if (pourcentage > 100.0f) pourcentage = 100.0f;
    return pourcentage;
}
