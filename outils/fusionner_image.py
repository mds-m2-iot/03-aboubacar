"""
=====================================================================
 fusionner_image.py · fabriquer une image flash amorcable
=====================================================================
 PlatformIO produit trois fichiers separes, et c'est ce que l'outil de
 televersement attend : il les ecrit un par un, chacun a son adresse.

     bootloader.bin   a 0x1000    le premier code execute par la puce
     partitions.bin   a 0x8000    la carte du contenu de la memoire
     firmware.bin     a 0x10000   l'application elle-meme

 Un simulateur, lui, ne televerse rien : il veut une image de la
 memoire flash telle qu'elle serait apres televersement. Lui donner le
 seul firmware.bin revient a lui donner une maison sans fondations : la
 puce demarre, ne trouve pas de bootloader valide, et ne dit rien du
 tout. Console vide et ecran noir, sans le moindre message d'erreur.

 Ce script reconstitue l'image complete. C'est exactement ce que fait
 « esptool merge_bin », en quinze lignes et sans dependance, pour que
 le depot n'exige rien de plus que Python.

 Usage, depuis la racine du depot :
     python outils/fusionner_image.py            mode ble, celui des seances 1 et 2
     python outils/fusionner_image.py esp32dev   mode reseau, seances 3 a 6
     python outils/fusionner_image.py demo       mode portes ouvertes

 Un second argument choisit le dossier du firmware, quand il y en a
 plusieurs dans le depot :
     python outils/fusionner_image.py simu firmware-etudiant
=====================================================================
"""
import pathlib
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RACINE / "outils"))
from couleurs import ko, note, ok  # noqa: E402

# Les adresses sont celles du schema de demarrage de l'ESP32. Elles ne
# se choisissent pas : la puce lit le bootloader a 0x1000, et celui-ci
# va chercher la table de partitions a 0x8000.
ADRESSES = [
    (0x1000, "bootloader.bin"),
    (0x8000, "partitions.bin"),
    (0x10000, "firmware.bin"),
]

# Une flash effacee vaut 0xFF partout : on remplit les intervalles avec
# cette valeur plutot qu'avec des zeros, pour que l'image ressemble
# exactement a ce qu'un televersement reel aurait laisse.
OCTET_VIDE = 0xFF


def fusionner(environnement, dossier="firmware"):
    """Assemble les trois morceaux et renvoie le chemin de l'image."""
    build = RACINE / dossier / ".pio" / "build" / environnement

    if not build.is_dir():
        ko("dossier de compilation absent : %s" % build)
        note("compiler d'abord : py -m platformio run -e %s -d %s" % (environnement, dossier))
        return None

    manquants = [nom for _, nom in ADRESSES if not (build / nom).exists()]
    if manquants:
        ko("morceaux manquants : %s" % ", ".join(manquants))
        note("relancer une compilation complete de l'environnement %s" % environnement)
        return None

    # On assemble en memoire : l'image fait moins de deux megaoctets,
    # et un tampon unique evite d'avoir a gerer des ecritures partielles
    # si le disque venait a refuser une operation en cours de route.
    image = bytearray()
    for adresse, nom in ADRESSES:
        morceau = (build / nom).read_bytes()
        if len(image) > adresse:
            ko("%s deborde sur l'adresse 0x%X" % (nom, adresse))
            return None
        image.extend(bytes([OCTET_VIDE]) * (adresse - len(image)))
        image.extend(morceau)
        note("0x%06X  %-16s %7d octets" % (adresse, nom, len(morceau)))

    sortie = build / "merged.bin"
    sortie.write_bytes(bytes(image))
    ok("image assemblee : %s . %d octets" % (sortie.relative_to(RACINE), len(image)))
    return sortie


if __name__ == "__main__":
    environnement = sys.argv[1] if len(sys.argv) > 1 else "ble"
    dossier = sys.argv[2] if len(sys.argv) > 2 else "firmware"
    resultat = fusionner(environnement, dossier)
    sys.exit(0 if resultat else 1)
