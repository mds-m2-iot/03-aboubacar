import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formaterAnciennete, formaterValeur, useMaintenant } from '../../lib/affichage';
import { CONFIG } from '../../lib/config';
import type { ChargeStatut } from '../../lib/contrat';
import { FICHE } from '../../lib/fiche';
import {
  couleurHumeur,
  etatAffiche,
  libelleHumeur,
  mesureConsolidee,
  messageHumeur,
} from '../../lib/humeur';
import { libelleEtat } from '../../lib/lien';
import { greeting, momentOfDay, touchLine, VIBRATIONS } from '../../lib/personality';
import { COULEURS, ESPACES, RAYONS } from '../../lib/theme';
import { usePlante } from '../../store/plante';
import { Fond } from '../../components/Fond';
import { Verre } from '../../components/Verre';

/** Ce que le statut retenu dit de la plante, et seulement lui. */
function textePlante(statut: ChargeStatut | null): string {
  if (!statut) return 'Plante : pas encore de statut reçu du broker.';
  if (statut.en_ligne) return 'Plante en ligne.';
  return "Plante hors ligne : son testament vient d'arriver.";
}

export default function Accueil() {
  const mesures = usePlante((etat) => etat.mesures);
  const etatConnexion = usePlante((etat) => etat.etatConnexion);
  const detailConnexion = usePlante((etat) => etat.detailConnexion);
  const relancer = usePlante((etat) => etat.relancer);
  const source = usePlante((etat) => etat.source);
  const statutPlante = usePlante((etat) => etat.statutPlante);
  const maintenant = useMaintenant();

  const mesure = useMemo(() => mesureConsolidee(mesures), [mesures]);
  const humeur = etatAffiche(mesure, FICHE.seuils, maintenant);
  // Séance 6 · la personnalité. Sans toucher, la plante salue selon
  // l'heure ; touchée, elle répond selon son humeur et son caractère.
  const trait = usePlante((etat) => etat.trait);
  const [touches, setTouches] = useState(0);
  const bulle =
    touches === 0 ? greeting(trait, momentOfDay(maintenant)) : touchLine(trait, humeur, touches - 1);

  function quandOnTouche(): void {
    setTouches((n) => n + 1);
    Vibration.vibrate(VIBRATIONS[humeur]);
  }

  // Huit secondes sans toucher, et la plante reprend sa salutation.
  // Chaque nouveau toucher relance le minuteur.
  useEffect(() => {
    if (touches === 0) return;
    const minuteur = setTimeout(() => setTouches(0), 8000);
    return () => clearTimeout(minuteur);
  }, [touches]);

  const peutRelancer = etatConnexion === 'perdue' || etatConnexion === 'erreur' || etatConnexion === 'inactive';

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
      <Text style={styles.nom}>{FICHE.nom}</Text>
      <View style={styles.filet} />
      <Text style={styles.espece}>
        {FICHE.espece} · {FICHE.nomLatin}
      </Text>

      <Pressable
        onPress={quandOnTouche}
        accessibilityRole="button"
        accessibilityLabel={`Humeur de ${FICHE.nom} : ${libelleHumeur(humeur)}`}
        accessibilityHint="Touche la plante pour qu’elle te réponde"
      >
      <Verre style={styles.carte} teinte={`${couleurHumeur(humeur)}22`} interactif>
        <View style={styles.enTeteHumeur}>
          <View style={[styles.pastille, { backgroundColor: couleurHumeur(humeur) }]} />
          <Text style={styles.titreCarte}>SON HUMEUR</Text>
        </View>
        <View style={styles.bulle} accessibilityLiveRegion="polite">
          <Text style={styles.texteBulle}>{bulle}</Text>
        </View>
        <Text style={styles.humeur}>{libelleHumeur(humeur)}</Text>
        <Text style={styles.message}>« {messageHumeur(humeur, FICHE.messages)} »</Text>
        {mesure && mesure.humidite !== null ? (
          <Text style={styles.legende}>
            Humidité du sol {formaterValeur(mesure.humidite)} %, confort entre {FICHE.seuils.bas} et{' '}
            {FICHE.seuils.haut} %, {formaterAnciennete(mesure.horodatage, maintenant)}.
          </Text>
        ) : (
          <Text style={styles.legende}>
            Aucune mesure d’humidité reçue. Tant qu’il n’y en a pas, cet écran le dit au lieu
            d’afficher un zéro.
          </Text>
        )}
      </Verre>
      </Pressable>

      <Verre style={styles.carte}>
        <Text style={styles.titreCarte}>
          {source === 'ble' ? `EN BLUETOOTH · ${FICHE.nomAnnonce}` : `PAR LE BROKER · ${CONFIG.idBinome}`}
        </Text>
        <Text style={styles.etat}>{libelleEtat(etatConnexion)}</Text>
        {detailConnexion ? <Text style={styles.legende}>{detailConnexion}</Text> : null}
        {source === 'mqtt' ? <Text style={styles.plante}>{textePlante(statutPlante)}</Text> : null}
        {peutRelancer ? (
          <Pressable
            onPress={relancer}
            accessibilityRole="button"
            style={({ pressed }) => [styles.bouton, pressed && styles.boutonAppuye]}
          >
            <Text style={styles.boutonTexte}>Relancer la connexion</Text>
          </Pressable>
        ) : null}
      </Verre>

      <Link href={`/plante/${FICHE.id}`} asChild>
        <Pressable accessibilityRole="link">
          <Verre style={styles.lien} interactif>
            <Text style={styles.lienTexte}>Voir ses mesures et sa fiche</Text>
            <Text style={styles.lienFleche}>›</Text>
          </Verre>
        </Pressable>
      </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: ESPACES.grand, paddingBottom: ESPACES.grand * 3 },
  nom: { fontSize: 40, fontWeight: '800', letterSpacing: -0.5, color: COULEURS.texte },
  filet: {
    width: 56,
    height: 4,
    borderRadius: 2,
    backgroundColor: COULEURS.accent,
    marginTop: ESPACES.petit,
  },
  espece: { marginTop: ESPACES.moyen, fontSize: 15, color: COULEURS.gris },
  carte: { marginTop: ESPACES.grand, padding: ESPACES.grand },
  enTeteHumeur: { flexDirection: 'row', alignItems: 'center', gap: ESPACES.petit },
  pastille: { width: 10, height: 10, borderRadius: 5 },
  bulle: {
    alignSelf: 'flex-start',
    marginTop: ESPACES.moyen,
    paddingVertical: ESPACES.petit,
    paddingHorizontal: ESPACES.moyen,
    borderRadius: RAYONS.carte,
    backgroundColor: COULEURS.fond,
  },
  texteBulle: { fontSize: 15, fontStyle: 'italic', color: COULEURS.texte },
  titreCarte: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: COULEURS.gris },
  humeur: { marginTop: ESPACES.petit, fontSize: 32, fontWeight: '800', color: COULEURS.texte },
  message: { marginTop: ESPACES.petit, fontSize: 18, fontStyle: 'italic', color: COULEURS.texte },
  etat: { marginTop: ESPACES.petit, fontSize: 18, fontWeight: '600', color: COULEURS.texte },
  plante: { marginTop: ESPACES.petit, fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  legende: { marginTop: ESPACES.petit, fontSize: 14, lineHeight: 20, color: COULEURS.gris },
  bouton: {
    alignSelf: 'flex-start',
    marginTop: ESPACES.moyen,
    paddingVertical: ESPACES.petit + 2,
    paddingHorizontal: ESPACES.grand,
    borderRadius: RAYONS.bouton,
    backgroundColor: COULEURS.accent,
  },
  boutonAppuye: { opacity: 0.8 },
  boutonTexte: { fontSize: 15, fontWeight: '600', color: COULEURS.carte },
  lien: {
    marginTop: ESPACES.grand,
    paddingVertical: ESPACES.moyen,
    paddingHorizontal: ESPACES.grand,
    borderRadius: RAYONS.bouton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lienTexte: { fontSize: 16, fontWeight: '600', color: COULEURS.texte },
  lienFleche: { fontSize: 24, fontWeight: '300', color: COULEURS.accent },
});
