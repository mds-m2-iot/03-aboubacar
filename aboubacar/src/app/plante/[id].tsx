// =====================================================================
//  app/plante/[id].tsx · la fiche complète, en route dynamique
// =====================================================================
//  Les crochets font partie du nom du fichier, littéralement.
//
//  Ce fichier répond à /plante/passiflore, à /plante/42 et à
//  /plante/nimportequoi. useLocalSearchParams rend ce qui a été passé,
//  et rien ne garantit que ce soit valide : d'où le cas « inconnue »
//  traité en premier, avant le rendu normal.
//
//  LE RETOUR. Cet écran ne vit pas dans la barre d'onglets : sans
//  bouton, on y reste coincé. router.back() revient d'où l'on vient.
//
//  EN DIRECT, séance 2. Les trois mesures s'affichent en haut de la
//  fiche, recollées par cycle, avec leur âge. Une valeur absente
//  s'affiche en tiret et jamais en zéro : un capteur débranché doit se
//  voir, pas se faire passer pour une plante sèche dans le noir.
// =====================================================================
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formaterAnciennete, formaterValeur, useMaintenant } from '../../lib/affichage';
import { DUREE_FRAICHEUR_MS } from '../../lib/contrat';
import { ficheParId } from '../../lib/fiche';
import { mesureConsolidee } from '../../lib/humeur';
import { COULEURS, ESPACES, RAYONS } from '../../lib/theme';
import { Fond } from '../../components/Fond';
import { Verre } from '../../components/Verre';
import { usePlante } from '../../store/plante';

function Retour() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Revenir à l'accueil"
      style={styles.retourZone}
    >
      <Verre style={styles.retour} interactif>
        <Text style={styles.retourTexte}>‹  Retour</Text>
      </Verre>
    </Pressable>
  );
}

function Bloc({ titre, texte }: { titre: string; texte: string }) {
  return (
    <Verre style={styles.carte}>
      <Text style={styles.titreCarte}>{titre}</Text>
      <Text style={styles.corps}>{texte}</Text>
    </Verre>
  );
}

function Valeur({ etiquette, valeur, unite }: { etiquette: string; valeur: number | null; unite: string }) {
  return (
    <View style={styles.valeur}>
      <Text style={styles.chiffre}>
        {formaterValeur(valeur)}
        {valeur !== null ? <Text style={styles.unite}> {unite}</Text> : null}
      </Text>
      <Text style={styles.etiquette}>{etiquette}</Text>
    </View>
  );
}

function EnDirect() {
  const mesures = usePlante((etat) => etat.mesures);
  const maintenant = useMaintenant();
  const mesure = useMemo(() => mesureConsolidee(mesures), [mesures]);

  const perimee = mesure !== null && maintenant - mesure.horodatage > DUREE_FRAICHEUR_MS;
  const legende = !mesure
    ? "Aucune mesure reçue. Vérifie l'état de la carte sur l'accueil."
    : perimee
      ? `Dernière mesure ${formaterAnciennete(mesure.horodatage, maintenant)} : elle ne dit plus rien de l'état actuel.`
      : `Mesuré ${formaterAnciennete(mesure.horodatage, maintenant)}, une nouvelle valeur toutes les deux secondes.`;

  return (
    <Verre style={styles.carte}>
      <Text style={styles.titreCarte}>EN DIRECT</Text>
      <View style={[styles.ligneValeurs, perimee && styles.perimee]}>
        <Valeur etiquette="Humidité du sol" valeur={mesure?.humidite ?? null} unite="%" />
        <Valeur etiquette="Température" valeur={mesure?.temperature ?? null} unite="°C" />
        <Valeur etiquette="Lumière" valeur={mesure?.lumiere ?? null} unite="%" />
      </View>
      <Text style={styles.legende}>{legende}</Text>
    </Verre>
  );
}

export default function FicheDeLaPlante() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fiche = ficheParId(id);

  if (!fiche) {
    return (
      <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
        <View style={styles.contenu}>
          <Retour />
          <Text style={styles.titre}>Plante inconnue</Text>
          <View style={styles.filet} />
          <Text style={styles.corps}>
            Aucune fiche ne porte l’identifiant « {id} ». Une route dynamique reçoit ce qu’on lui
            donne, il faut donc toujours prévoir ce cas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Retour />
        <Text style={styles.titre}>{fiche.nom}</Text>
        <View style={styles.filet} />
        <Text style={styles.sousTitre}>
          {fiche.espece} · {fiche.nomLatin}
        </Text>

        <EnDirect />

        <Bloc titre={`SEUIL BAS · ${fiche.seuils.bas} %`} texte={fiche.pourquoiBas} />
        <Bloc titre={`SEUIL HAUT · ${fiche.seuils.haut} %`} texte={fiche.pourquoiHaut} />
        <Bloc titre="EXPOSITION" texte={fiche.exposition} />
        <Bloc titre="ARROSAGE" texte={fiche.arrosage} />
        <Bloc titre="SOURCE" texte={fiche.source} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: ESPACES.grand, paddingBottom: ESPACES.grand * 2 },
  retourZone: { alignSelf: 'flex-start', marginBottom: ESPACES.moyen },
  retour: {
    paddingVertical: ESPACES.petit,
    paddingHorizontal: ESPACES.moyen,
    borderRadius: RAYONS.bouton,
  },
  retourTexte: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  titre: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, color: COULEURS.texte },
  filet: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: COULEURS.accent,
    marginTop: ESPACES.petit,
  },
  sousTitre: { marginTop: ESPACES.moyen, fontSize: 15, color: COULEURS.gris },
  carte: { marginTop: ESPACES.grand, padding: ESPACES.grand },
  titreCarte: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: COULEURS.gris },
  corps: { marginTop: ESPACES.petit, fontSize: 15, lineHeight: 21, color: COULEURS.texte },
  ligneValeurs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: ESPACES.moyen },
  perimee: { opacity: 0.4 },
  valeur: { flex: 1 },
  chiffre: { fontSize: 26, fontWeight: '700', color: COULEURS.texte },
  unite: { fontSize: 15, fontWeight: '400', color: COULEURS.gris },
  etiquette: { marginTop: 2, fontSize: 12, color: COULEURS.gris },
  legende: { marginTop: ESPACES.moyen, fontSize: 13, lineHeight: 18, color: COULEURS.gris },
});
