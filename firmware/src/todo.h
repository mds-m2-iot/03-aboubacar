// =====================================================================
//  todo.h · signaler a la console ce qui n'est pas encore ecrit
// =====================================================================
//  Chaque trou de ce firmware appelle A_ECRIRE une fois, puis continue
//  avec une valeur neutre. Consequence voulue : la carte demarre des le
//  premier jour, l'ecran s'allume, la boucle tourne, et la console dit
//  exactement ce qui manque.
//
//      [TODO] seance 2, trou 2 : la conversion du brut en pourcentage
//
//  C'est un choix, et il se discute. Un firmware qui refuse de compiler
//  tant que tout n'est pas ecrit a l'avantage de la franchise, mais il
//  ne laisse rien a observer tant que le dernier trou n'est pas comble.
//  Ici tu pars d'une carte qui tourne et qui ment : elle affiche 0 % en
//  permanence, elle se croit toujours heureuse, elle n'envoie rien. A
//  chaque trou comble, un de ces mensonges disparait.
//
//  Le message ne sort qu'une fois par trou. La boucle repasse toutes
//  les deux secondes, et une console qui repete la meme ligne devient
//  illisible en trente secondes.
//
//  Ce fichier n'existe pas dans le firmware de reference : il n'y a
//  la-bas aucun trou a signaler.
// =====================================================================
#pragma once
#include <Arduino.h>

// Nombre de trous du firmware. Sert a dimensionner le registre ci-dessous.
#define NOMBRE_DE_TROUS 10

// ---------------------------------------------------------------------
//  Un seul registre, plutot qu'un temoin par trou
// ---------------------------------------------------------------------
//  La premiere version posait un « static bool » a l'interieur de chaque
//  appel de la macro. Dix temoins d'un octet, disperses dans la memoire,
//  chacun dans une fonction differente. Le mecanisme s'est mis a manquer
//  un trou a l'allumage, toujours le meme, sans qu'on puisse le
//  reproduire ni l'expliquer : le code machine etait correct, le temoin
//  etait bien en zone effacee au demarrage, et pourtant la ligne ne
//  sortait pas.
//
//  Plutot que de continuer a chercher, on supprime la classe entiere de
//  doutes. Un seul tableau, un seul endroit, indexe par le numero du
//  trou. Il n'y a plus rien qui puisse etre aligne de travers ni ecrase
//  par un voisin.
//
//  La lecon vaut d'etre dite en cours : quand un defaut resiste a
//  l'explication, remplacer le mecanisme coute souvent moins cher que
//  de le comprendre, a condition que le remplacement soit plus simple
//  que l'original et non l'inverse.
// ---------------------------------------------------------------------
inline bool todo_deja_dit(int trou) {
    static bool dits[NOMBRE_DE_TROUS + 1] = { false };
    if (trou < 1 || trou > NOMBRE_DE_TROUS) return true;
    if (dits[trou]) return true;
    dits[trou] = true;
    return false;
}

// ---------------------------------------------------------------------
//  A_ECRIRE . signaler une fois ce qui n'est pas encore ecrit
// ---------------------------------------------------------------------
//  Le flush n'est pas decoratif. Sans lui, la ligne part dans le tampon
//  du port serie et attend son tour ; avec lui, elle est sortie avant
//  que la boucle continue. Sur dix lignes emises au demarrage, cela
//  supprime toute dependance a l'etat du tampon.
// ---------------------------------------------------------------------
#define A_ECRIRE(seance, trou, quoi)                                    \
    do {                                                                \
        if (!todo_deja_dit((int)(trou))) {                              \
            Serial.printf("[TODO] seance %d, trou %d : %s\r\n",         \
                          (int)(seance), (int)(trou), (quoi));          \
            Serial.flush();                                             \
        }                                                               \
    } while (0)
