import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONFIG } from '../../lib/config';
import { prefixeSujet } from '../../lib/contrat';
import { FICHE } from '../../lib/fiche';
import { checkInflux } from '../../lib/influx';
import { libelleEtat } from '../../lib/lien';
import { COULEURS, ESPACES, RAYONS } from '../../lib/theme';
import { Fond } from '../../components/Fond';
import { Verre } from '../../components/Verre';
import { usePlante, type Source } from '../../store/plante';

function Ligne({ etiquette, valeur }: { etiquette: string; valeur: string }) {
  return (
    <View style={styles.ligne}>
      <Text style={styles.etiquette}>{etiquette}</Text>
      <Text style={styles.valeur}>{valeur}</Text>
    </View>
  );
}

function ChoixSource({ valeur, libelle }: { valeur: Source; libelle: string }) {
  const source = usePlante((etat) => etat.source);
  const definirSource = usePlante((etat) => etat.definirSource);
  const actif = source === valeur;
  return (
    <Pressable
      onPress={() => definirSource(valeur)}
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      style={[styles.choix, actif && styles.choixActif]}
    >
      <Text style={[styles.choixTexte, actif && styles.choixTexteActif]}>{libelle}</Text>
    </Pressable>
  );
}

/** Garde l'hôte, cache le reste : c'est ce qu'on a besoin de vérifier à l'œil. */
function hote(url: string): string {
  const trouve = /^(?:wss?|https?):\/\/([^/]+)/.exec(url);
  return trouve ? trouve[1] : url || 'absente';
}

export default function Reglages() {
  const etatConnexion = usePlante((etat) => etat.etatConnexion);
  // gcTime: 0 : le résultat est oublié dès qu'on quitte l'écran, la base
  // est revérifiée à chaque visite. retry: false : un jeton refusé
  // s'affiche tout de suite, sans trois essais d'attente.
  const base = useQuery({
    queryKey: ['influx', 'etat'],
    queryFn: ({ signal }) => checkInflux(signal),
    retry: false,
    gcTime: 0,
  });
  const etatBase = base.isPending
    ? 'vérification…'
    : base.isError
      ? base.error.message
      : base.data;

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Fond />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>Réglages</Text>
        <View style={styles.filet} />

        <Verre style={styles.carte}>
          <Text style={styles.titreCarte}>SOURCE DES MESURES</Text>
          <View style={styles.choixLigne}>
            <ChoixSource valeur="ble" libelle="Bluetooth" />
            <ChoixSource valeur="mqtt" libelle="Broker MQTT" />
          </View>
          <Ligne etiquette="État du lien" valeur={libelleEtat(etatConnexion)} />
          <Text style={styles.legende}>
            Une seule source à la fois. Le Bluetooth demande d’être à côté de la carte, le broker
            marche de partout, en 4G comprise.
          </Text>
        </Verre>

        <Verre style={styles.carte}>
          <Text style={styles.titreCarte}>BLUETOOTH</Text>
          <Ligne etiquette="Carte attendue" valeur={FICHE.nomAnnonce} />
          <Text style={styles.legende}>
            Le nom se règle dans NOM_PLANTE, fichier firmware/src/config.h, et s’écrit à
            l’identique dans src/lib/fiche.ts.
          </Text>
        </Verre>

        <Verre style={styles.carte}>
          <Text style={styles.titreCarte}>BROKER MQTT · FICHIER .ENV</Text>
          <Ligne etiquette="Serveur" valeur={hote(CONFIG.mqttUrl)} />
          <Ligne etiquette="Utilisateur" valeur={CONFIG.mqttUtilisateur || 'absent'} />
          <Ligne etiquette="Mot de passe" valeur={CONFIG.mqttMotDePasse ? 'renseigné' : 'absent'} />
          <Ligne etiquette="Identifiant de binôme" valeur={CONFIG.idBinome} />
          <Ligne etiquette="Préfixe des sujets" valeur={prefixeSujet(CONFIG.idBinome)} />
          <Text style={styles.legende}>
            Le préfixe se calcule, il ne se recopie pas. L’identifiant doit être le même que
            ID_BINOME dans la configuration de la carte.
          </Text>
        </Verre>

        <Verre style={styles.carte}>
          <Text style={styles.titreCarte}>BASE DE L’HISTORIQUE · FICHIER .ENV</Text>
          <Ligne etiquette="État de la base" valeur={etatBase} />
          <Ligne etiquette="Serveur" valeur={hote(CONFIG.influxUrl)} />
          <Ligne etiquette="Organisation" valeur={CONFIG.influxOrg || 'absente'} />
          <Ligne etiquette="Bucket" valeur={CONFIG.influxBucket || 'absent'} />
          <Ligne etiquette="Jeton" valeur={CONFIG.influxToken ? 'renseigné' : 'absent'} />
          <Text style={styles.legende}>
            Le jeton ne s’affiche jamais, et ne part jamais dans Git. L’historique filtre sur
            l’identifiant de binôme de la carte du broker.
          </Text>
        </Verre>

        <Verre style={styles.carte}>
          <Text style={styles.titreCarte}>SEUILS DE LA PLANTE</Text>
          <Ligne etiquette="Seuil bas" valeur={`${FICHE.seuils.bas} %`} />
          <Ligne etiquette="Seuil haut" valeur={`${FICHE.seuils.haut} %`} />
        </Verre>
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
  carte: { marginTop: ESPACES.grand, padding: ESPACES.grand },
  titreCarte: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: COULEURS.gris, marginBottom: ESPACES.petit },
  choixLigne: { flexDirection: 'row', gap: ESPACES.petit, marginBottom: ESPACES.petit },
  choix: {
    flex: 1,
    paddingVertical: ESPACES.petit,
    borderRadius: RAYONS.bouton,
    borderWidth: 1,
    borderColor: COULEURS.filet,
    alignItems: 'center',
  },
  choixActif: { backgroundColor: COULEURS.accent, borderColor: COULEURS.accent },
  choixTexte: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  choixTexteActif: { color: COULEURS.carte },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: ESPACES.petit,
  },
  etiquette: { fontSize: 15, color: COULEURS.gris },
  valeur: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  legende: { marginTop: ESPACES.petit, fontSize: 13, lineHeight: 18, color: COULEURS.gris },
});
