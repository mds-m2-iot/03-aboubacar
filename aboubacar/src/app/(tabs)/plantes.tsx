// =====================================================================
//  app/(tabs)/plantes.tsx · mes plantes
// =====================================================================
//  Séance 6, « Plusieurs plantes ». La liste des plantes suivies, leur
//  humeur du moment, et un formulaire pour en ajouter une. Ajouter une
//  plante l'écoute tout de suite : le magasin change, _layout.tsx le
//  voit et demande au client MQTT de s'abonner, sans reconnexion.
//
//  L'humeur d'une plante qu'on ne connaît pas se calcule avec les seuils
//  par défaut du contrat : on n'a pas sa fiche d'espèce. C'est une limite
//  à dire, pas à cacher.
// =====================================================================
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formaterAnciennete, formaterValeur, useMaintenant } from '../../lib/affichage';
import { CONFIG } from '../../lib/config';
import { SEUILS_DEFAUT } from '../../lib/contrat';
import { couleurHumeur, etatAffiche, libelleHumeur } from '../../lib/humeur';
import { isValidPlantId } from '../../lib/plants';
import { COULEURS, ESPACES, RAYONS } from '../../lib/theme';
import { Fond } from '../../components/Fond';
import { Verre } from '../../components/Verre';
import { usePlants } from '../../store/plants';

export default function MesPlantes() {
  const plants = usePlants((state) => state.plants);
  const latest = usePlants((state) => state.latest);
  const add = usePlants((state) => state.add);
  const maintenant = useMaintenant();

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  // Ta propre plante est déjà sur l'accueil : on ne la suit pas une deuxième fois.
  const idOk = isValidPlantId(id.trim()) && id.trim() !== CONFIG.idBinome;
  const deja = plants.some((p) => p.id === id.trim());

  function ajouter(): void {
    if (!idOk || deja) return;
    add(id, name);
    setId('');
    setName('');
  }

  const formulaire = (
    <>
      <Text style={styles.titre}>Mes plantes</Text>
      <View style={styles.filet} />

      <Verre style={styles.carte}>
        <Text style={styles.titreCarte}>SUIVRE UNE PLANTE</Text>
        <TextInput
          value={id}
          onChangeText={setId}
          placeholder="Identifiant de sa carte, par exemple binome-07"
          placeholderTextColor={COULEURS.gris}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.champ}
          accessibilityLabel="Identifiant de la carte"
        />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Son petit nom (facultatif)"
          placeholderTextColor={COULEURS.gris}
          style={styles.champ}
          accessibilityLabel="Petit nom de la plante"
        />
        <Pressable
          onPress={ajouter}
          disabled={!idOk || deja}
          style={({ pressed }) => [
            styles.bouton,
            (!idOk || deja) && styles.boutonInactif,
            pressed && styles.boutonAppuye,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.boutonTexte}>
            {id.trim() === CONFIG.idBinome ? 'C’est ta plante' : deja ? 'Déjà suivie' : 'Ajouter'}
          </Text>
        </Pressable>
      </Verre>
    </>
  );

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <FlatList
        data={plants}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.contenu}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={formulaire}
        ListEmptyComponent={
          <Text style={styles.vide}>Aucune plante suivie. Ajoute celle d’un voisin pour essayer.</Text>
        }
        renderItem={({ item }) => {
          const m = latest[item.id] ?? null;
          const humeur = etatAffiche(m, SEUILS_DEFAUT, maintenant);
          return (
            <Link href={{ pathname: '/plantes/[id]', params: { id: item.id } }} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${libelleHumeur(humeur)}`}
              >
                <Verre style={styles.ligne} teinte={`${couleurHumeur(humeur)}22`} interactif>
                  <View style={[styles.pastille, { backgroundColor: couleurHumeur(humeur) }]} />
                  <View style={styles.ligneTexte}>
                    <Text style={styles.nom}>{item.name}</Text>
                    <Text style={styles.detail}>
                      {libelleHumeur(humeur)}
                      {m
                        ? ` · ${formaterValeur(m.humidite)} % · ${formaterAnciennete(m.horodatage, maintenant)}`
                        : ' · en attente de mesure'}
                    </Text>
                  </View>
                  <Text style={styles.fleche}>›</Text>
                </Verre>
              </Pressable>
            </Link>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: ESPACES.grand, paddingBottom: ESPACES.grand * 3 },
  titre: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, color: COULEURS.texte },
  filet: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: COULEURS.accent,
    marginTop: ESPACES.petit,
  },
  carte: { marginVertical: ESPACES.grand, padding: ESPACES.grand },
  titreCarte: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: COULEURS.gris,
    marginBottom: ESPACES.petit,
  },
  champ: {
    borderWidth: 1,
    borderColor: COULEURS.filet,
    borderRadius: RAYONS.bouton,
    paddingVertical: ESPACES.petit + 2,
    paddingHorizontal: ESPACES.moyen,
    marginBottom: ESPACES.petit,
    fontSize: 15,
    color: COULEURS.texte,
  },
  bouton: {
    alignSelf: 'flex-start',
    marginTop: ESPACES.petit,
    paddingVertical: ESPACES.petit + 2,
    paddingHorizontal: ESPACES.grand,
    borderRadius: RAYONS.bouton,
    backgroundColor: COULEURS.accent,
  },
  boutonInactif: { opacity: 0.4 },
  boutonAppuye: { opacity: 0.8 },
  boutonTexte: { fontSize: 15, fontWeight: '600', color: COULEURS.carte },
  vide: { fontSize: 15, lineHeight: 21, color: COULEURS.gris },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACES.moyen,
    padding: ESPACES.moyen,
    marginBottom: ESPACES.petit,
  },
  pastille: { width: 12, height: 12, borderRadius: 6 },
  ligneTexte: { flex: 1 },
  nom: { fontSize: 18, fontWeight: '700', color: COULEURS.texte },
  detail: { marginTop: 4, fontSize: 14, color: COULEURS.gris },
  fleche: { fontSize: 24, fontWeight: '300', color: COULEURS.accent },
});
