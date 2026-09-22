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
    (void)humidite; (void)seuilBas; (void)seuilHaut;
    A_ECRIRE(2, 3, "les cinq humeurs, dans humeur.h");
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
        case NOYEE:     return "Je nage, arrete un peu";
        case REPUT:     return "J'ai un peu trop bu";
        case SOIF:      return "J'ai soif";
        case ASSOIFFEE: return "Au secours, de l'eau";
        default:        return "Tout va bien, merci";
    }
}

// Conversion d'une valeur brute du convertisseur en pourcentage.
// Les deux capteurs du kit renvoient une valeur qui BAISSE quand la
// grandeur mesuree monte : c'est contre-intuitif, et c'est normal.
inline float versPourcentage(int brut, int borneBasse, int borneHaute) {
    // -----------------------------------------------------------------
    //  TODO seance 2 . trou 2 . du brut au pourcentage
    // -----------------------------------------------------------------
    //  A ecrire, dans cet ordre :
    //    1. si les deux bornes sont egales, rendre 0 sans diviser ;
    //    2. faire une regle de trois entre borneBasse et borneHaute ;
    //    3. borner le resultat entre 0 et 100.
    //
    //  LE PIEGE . les deux capteurs du kit renvoient une valeur qui
    //  BAISSE quand la grandeur mesuree MONTE. borneBasse est donc la
    //  valeur brute du cas « sec » ou « sombre », qui est la PLUS
    //  GRANDE des deux. Si tu ecris la regle de trois dans le sens
    //  habituel, tu obtiens 100 % dans un pot sec, et tout le reste de
    //  la chaine s'en trouve inverse jusqu'a l'ecran du telephone.
    //
    //  L'etape 1 n'est pas de la coquetterie : sans elle, un binome qui
    //  calibre deux fois sur le meme point divise par zero, et la carte
    //  redemarre en boucle sans dire pourquoi.
    //
    //  LE CONTROLE . a l'air libre tu dois lire 0 %, dans un verre
    //  d'eau 100 %. Les valeurs brutes s'affichent a cote sur la
    //  console, ce sont elles qui servent a calibrer.
    //
    //  MARCHE A SUIVRE
    //     1. Commence par la garde. Si borneBasse vaut borneHaute, rends
    //        0.0f tout de suite. Sans elle, la ligne suivante divise par
    //        zero et la carte redemarre en boucle sans dire pourquoi.
    //     2. Ecris la regle de trois dans une variable float. Le numerateur
    //        est la distance entre le brut et la borne SECHE, le
    //        denominateur est la distance entre les deux bornes. Pose les
    //        deux valeurs de ta calibration sur un papier avant d'ecrire :
    //        celle qui correspond a SEC est la PLUS GRANDE des deux, et
    //        c'est ce qui surprend.
    //     3. Transtype en (float) avant de diviser. Sans cela, C++ fait une
    //        division entiere et te rend 0 ou 1.
    //     4. Borne le resultat entre 0 et 100 avec deux si. Un capteur peut
    //        lire hors de sa plage de calibration.
    //     5. Rends la valeur, et supprime le return 0.0f qui suit.
    // -----------------------------------------------------------------
    (void)brut; (void)borneBasse; (void)borneHaute;
    A_ECRIRE(2, 2, "la conversion du brut en pourcentage, dans humeur.h");
    return 0.0f;
}
