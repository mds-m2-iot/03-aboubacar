import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFIG } from '../../lib/config';
import { fetchHistory, PERIODS, type Period } from '../../lib/influx';
import { COULEURS, ESPACES, RAYONS } from '../../lib/theme';
import { CourbeHumidite } from '../../components/CourbeHumidite';
import { Fond } from '../../components/Fond';
import { Verre } from '../../components/Verre';

const CHOIX = Object.keys(PERIODS) as Period[];

function ChoixPeriode({
  valeur,
  actif,
  surChoix,
}: {
  valeur: Period;
  actif: boolean;
  surChoix: (valeur: Period) => void;
}) {
  // Le bouton actif se voit sans la couleur : bordure épaisse et texte
  // en gras. VoiceOver l'annonce « sélectionné » grâce à accessibilityState.
  return (
    <Pressable
      onPress={() => surChoix(valeur)}
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      style={[styles.choix, actif && styles.choixActif]}
    >
      <Text style={[styles.choixTexte, actif && styles.choixTexteActif]}>
        {PERIODS[valeur].label}
      </Text>
    </Pressable>
  );
}

export default function Historique() {
  const [period, setPeriod] = useState<Period>('fortnight');

  // La clé contient TOUT ce dont dépend la réponse. Sans period dedans,
  // TanStack croirait que c'est la même question et rendrait la même courbe.
  const query = useQuery({
    queryKey: ['history', CONFIG.idBinome, period],
    queryFn: ({ signal }) => fetchHistory(CONFIG.idBinome, period, signal),
    staleTime: 60_000,
  });

  let contenu;
  if (query.isPending && query.fetchStatus === 'paused') {
    // Hors ligne, TanStack Query met la requête en pause : une période
    // jamais chargée doit le dire, pas tourner sans fin.
    contenu = (
      <Text style={styles.legende}>Pas de réseau, et cette période n’a jamais été chargée.</Text>
    );
  } else if (query.isPending) {
    contenu = <ActivityIndicator color={COULEURS.accent} style={styles.attente} />;
  } else if (query.isError) {
    contenu = <Text style={styles.erreur}>{query.error.message}</Text>;
  } else if (query.data.length === 0) {
    contenu = (
      <Text style={styles.legende}>
        Aucune mesure sur cette période. La carte a-t-elle publié sur le broker ?
      </Text>
    );
  } else {
    contenu = (
      <CourbeHumidite
        points={query.data}
        fin={query.dataUpdatedAt}
        period={period}
      />
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>Historique</Text>
        <View style={styles.filet} />

        <View style={styles.choixLigne}>
          {CHOIX.map((valeur) => (
            <ChoixPeriode
              key={valeur}
              valeur={valeur}
              actif={valeur === period}
              surChoix={setPeriod}
            />
          ))}
        </View>

        <Verre style={styles.carte}>{contenu}</Verre>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: ESPACES.grand, paddingBottom: ESPACES.grand * 2 },
  titre: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, color: COULEURS.texte },
  filet: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: COULEURS.accent,
    marginTop: ESPACES.petit,
  },
  choixLigne: {
    flexDirection: 'row',
    gap: 4,
    marginTop: ESPACES.grand,
    padding: 4,
    borderRadius: RAYONS.bouton,
    backgroundColor: COULEURS.filet,
  },
  choix: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RAYONS.bouton,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  choixActif: {
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.accent,
    shadowColor: COULEURS.texte,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  choixTexte: { fontSize: 14, fontWeight: '500', color: COULEURS.gris },
  choixTexteActif: { fontWeight: '800', color: COULEURS.texte },
  carte: { marginTop: ESPACES.grand, padding: ESPACES.grand, minHeight: 120, justifyContent: 'center' },
  attente: { alignSelf: 'center' },
  erreur: { fontSize: 15, lineHeight: 21, color: COULEURS.texte },
  legende: { fontSize: 15, lineHeight: 21, color: COULEURS.gris },
  titreCarte: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: COULEURS.gris,
    marginBottom: ESPACES.petit,
  },
});
