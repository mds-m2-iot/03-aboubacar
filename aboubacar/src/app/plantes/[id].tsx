// =====================================================================
//  app/plantes/[id].tsx · la fiche d'une plante suivie
// =====================================================================
//  Séance 6. L'identifiant arrive par l'URL de la route, comme la fiche
//  d'espèce de plante/[id].tsx. La courbe est le même composant que
//  l'Historique de ta plante : seul l'identifiant change.
//
//  On n'a pas la fiche d'espèce d'une plante suivie : son humeur et sa
//  zone de confort prennent les seuils par défaut du contrat.
// =====================================================================
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formaterAnciennete, formaterValeur, useMaintenant } from '../../lib/affichage';
import { DUREE_FRAICHEUR_MS, SEUILS_DEFAUT } from '../../lib/contrat';
import { couleurHumeur, etatAffiche, libelleHumeur } from '../../lib/humeur';
import { COULEURS, ESPACES, RAYONS } from '../../lib/theme';
import { BlocHistorique } from '../../components/BlocHistorique';
import { Fond } from '../../components/Fond';
import { Verre } from '../../components/Verre';
import { usePlants } from '../../store/plants';

function Retour() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Revenir à la liste"
      style={styles.retourZone}
    >
      <Verre style={styles.retour} interactif>
        <Text style={styles.retourTexte}>‹  Retour</Text>
      </Verre>
    </Pressable>
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

export default function FichePlanteSuivie() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlants((state) => state.plants.find((p) => p.id === id));
  const m = usePlants((state) => (id ? state.latest[id] : undefined)) ?? null;
  const remove = usePlants((state) => state.remove);
  const maintenant = useMaintenant();

  if (!id || !plant) {
    return (
      <SafeAreaView style={styles.page} edges={['top']}>
        <Fond />
        <View style={styles.contenu}>
          <Retour />
          <Text style={styles.titre}>Plante introuvable</Text>
          <View style={styles.filet} />
          <Text style={styles.legende}>Elle a peut-être été retirée de ta liste.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const humeur = etatAffiche(m, SEUILS_DEFAUT, maintenant);
  const perimee = m !== null && maintenant - m.horodatage > DUREE_FRAICHEUR_MS;

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Retour />
        <Text style={styles.titre}>{plant.name}</Text>
        <View style={styles.filet} />
        <Text style={styles.sousTitre}>
          {plant.id} · {libelleHumeur(humeur)}
        </Text>

        <Verre style={styles.carte} teinte={`${couleurHumeur(humeur)}22`}>
          <Text style={styles.titreCarte}>DERNIÈRE MESURE</Text>
          <View style={[styles.ligneValeurs, perimee && styles.perimee]}>
            <Valeur etiquette="Humidité du sol" valeur={m?.humidite ?? null} unite="%" />
            <Valeur etiquette="Température" valeur={m?.temperature ?? null} unite="°C" />
            <Valeur etiquette="Lumière" valeur={m?.lumiere ?? null} unite="%" />
          </View>
          <Text style={styles.legende}>
            {m
              ? `Reçue ${formaterAnciennete(m.horodatage, maintenant)}.`
              : 'Aucune mesure reçue pour l’instant. Il faut être sur le broker MQTT.'}
          </Text>
        </Verre>

        <BlocHistorique pairId={plant.id} seuils={SEUILS_DEFAUT} />

        <Pressable
          onPress={() => {
            remove(plant.id);
            router.back();
          }}
          style={styles.retirer}
          accessibilityRole="button"
        >
          <Text style={styles.texteRetirer}>Ne plus suivre cette plante</Text>
        </Pressable>
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
  ligneValeurs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: ESPACES.moyen },
  perimee: { opacity: 0.4 },
  valeur: { flex: 1 },
  chiffre: { fontSize: 26, fontWeight: '700', color: COULEURS.texte },
  unite: { fontSize: 15, fontWeight: '400', color: COULEURS.gris },
  etiquette: { marginTop: 2, fontSize: 12, color: COULEURS.gris },
  legende: { marginTop: ESPACES.moyen, fontSize: 13, lineHeight: 18, color: COULEURS.gris },
  retirer: { marginTop: ESPACES.grand, padding: ESPACES.moyen, alignItems: 'center' },
  texteRetirer: { fontSize: 15, color: COULEURS.texte, textDecorationLine: 'underline' },
});
