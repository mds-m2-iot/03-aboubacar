"""
=====================================================================
 couleurs.py · afficher en couleur sans se soucier du terminal
=====================================================================
 Les deux scripts de controle appelent ce module pour ecrire leurs
 lignes. Il existe pour une seule raison : sous Windows, les sequences
 d'echappement ANSI ne sont pas interpretees par defaut. Sans ce
 module, le formateur qui lance les controles depuis PowerShell voit
 des lignes du genre :

     \033[0;32m[ok]\033[0m firmware

 au lieu d'un texte vert. Deux parades sont posees ici :

   1. on demande a Windows d'activer le mode « terminal virtuel »,
      disponible depuis Windows 10 version 1511 ;
   2. si cela echoue, ou si la sortie est redirigee vers un fichier,
      on n'ecrit tout simplement aucune couleur.

 Le resultat est lisible partout : Git Bash, PowerShell, WSL, macOS,
 et meme dans un fichier de journal.
=====================================================================
"""
import os
import sys


def _activer_les_couleurs():
    """Repond a la question : puis-je ecrire des sequences ANSI ici ?"""
    # Sortie redirigee vers un fichier ou un tube : jamais de couleur,
    # sinon le journal se remplit de caracteres illisibles.
    if not sys.stdout.isatty():
        return False

    # La convention no-color.org, respectee par beaucoup d'outils.
    if os.environ.get("NO_COLOR"):
        return False

    # Sur tout ce qui n'est pas Windows, ANSI fonctionne depuis toujours.
    if os.name != "nt":
        return True

    # Sous Windows, il faut armer le drapeau ENABLE_VIRTUAL_TERMINAL_PROCESSING
    # sur le descripteur de sortie standard. C'est un appel systeme, d'ou
    # le passage par ctypes. Si la version de Windows est trop ancienne,
    # SetConsoleMode echoue et on repart sans couleur.
    try:
        import ctypes

        noyau = ctypes.windll.kernel32
        SORTIE_STANDARD = -11
        MODE_TERMINAL_VIRTUEL = 0x0004
        poignee = noyau.GetStdHandle(SORTIE_STANDARD)
        mode = ctypes.c_uint32()
        if not noyau.GetConsoleMode(poignee, ctypes.byref(mode)):
            return False
        return bool(noyau.SetConsoleMode(poignee, mode.value | MODE_TERMINAL_VIRTUEL))
    except Exception:
        return False


_COULEUR = _activer_les_couleurs()

# Les codes ne sont definis qu'une fois, au chargement du module. Quand
# la couleur n'est pas disponible, ce sont des chaines vides : le reste
# du code n'a pas a tester quoi que ce soit.
VERT = "\033[0;32m" if _COULEUR else ""
ROUGE = "\033[0;31m" if _COULEUR else ""
GRIS = "\033[0;90m" if _COULEUR else ""
FIN = "\033[0m" if _COULEUR else ""


def ok(texte):
    """Une ligne de controle reussi."""
    print("  %s%s%s %s" % (VERT, "OK" if not _COULEUR else "✓", FIN, texte))


def ko(texte):
    """Une ligne de controle en echec."""
    print("  %s%s%s %s" % (ROUGE, "KO" if not _COULEUR else "✗", FIN, texte))


def note(texte):
    """Un commentaire discret, sous une ligne de controle."""
    print("    %s%s%s" % (GRIS, texte, FIN))
