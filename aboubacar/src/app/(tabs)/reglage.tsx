import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enqueue } from '../../lib/command-queue';
import { CONFIG } from '../../lib/config';
import { prefixeSujet, type Commande } from '../../lib/contrat';
import { FICHE } from '../../lib/fiche';
import { checkInflux, fetchInfluxHealth } from '../../lib/influx';
import { libelleEtat } from '../../lib/lien';
import { TRAITS, type Trait } from '../../lib/personality';
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

/** 14:05:32, écrit à la main : le support d'Intl varie selon le moteur JS. */
function heure(time: number): string {
  const d = new Date(time);
  const n = (v: number) => String(v).padStart(2, '0');
  return `${n(d.getHours())}:${n(d.getMinutes())}:${n(d.getSeconds())}`;
}

/** Garde l'hôte, cache le reste : c'est ce qu'on a besoin de vérifier à l'œil. */
function hote(url: string): string {
  const trouve = /^(?:wss?|https?):\/\/([^/]+)/.exec(url);
  return trouve ? trouve[1] : url || 'absente';
}

/** Trois commandes que la carte comprend (docs/CONTRAT.md, section 5). */
const BOUTONS_COMMANDE: { label: string; command: Commande }[] = [
  { label: 'Faire clignoter', command: { action: 'identifier' } },
  { label: 'Point sec', command: { action: 'calibrer', point: 'sec' } },
  { label: 'Point humide', command: { action: 'calibrer', point: 'humide' } },
];

/**
 * Séance 4 · la démo de la file. Connecté, une commande part tout de
 * suite ; hors ligne, elle s'écrit dans la file du disque et repart dans
 * l'ordre au retour du broker (app/_layout.tsx, useReplayQueue).
 */
function CommandesCarte() {
  const pendingCommands = usePlante((etat) => etat.pendingCommands);
  const [message, setMessage] = useState<string | null>(null);

  async function sendOrQueue(command: Commande, label: string): Promise<void> {
    const publish = usePlante.getState().publishCommand;
    if (publish?.(command)) {
      setMessage(`« ${label} » envoyée.`);
      return;
    }
    const queue = await enqueue(command);
    usePlante.getState().setPendingCommands(queue.length);
    setMessage(`Hors ligne : « ${label} » mise en file (${queue.length} en attente).`);
  }

  return (
    <Verre style={styles.carte}>
      <Text style={styles.titreCarte}>COMMANDES À LA CARTE</Text>
      <View style={styles.boutonsLigne}>
        {BOUTONS_COMMANDE.map((b) => (
          <Pressable
            key={b.label}
            onPress={() => void sendOrQueue(b.command, b.label)}
            accessibilityRole="button"
            style={styles.bouton}
          >
            <Text style={styles.boutonTexte}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
      <Ligne etiquette="En attente" valeur={`${pendingCommands}`} />
      {message && <Text style={styles.legende}>{message}</Text>}
    </Verre>
  );
}

/** Séance 6 · le caractère de la plante, gardé sur le téléphone par le magasin. */
function Caractere() {
  const trait = usePlante((etat) => etat.trait);
  const setTrait = usePlante((etat) => etat.setTrait);
  return (
    <Verre style={styles.carte}>
      <Text style={styles.titreCarte}>CARACTÈRE</Text>
      <View style={styles.choixLigne}>
        {(Object.keys(TRAITS) as Trait[]).map((t) => {
          const actif = t === trait;
          return (
            <Pressable
              key={t}
              onPress={() => setTrait(t)}
              accessibilityRole="radio"
              accessibilityState={{ checked: actif }}
              style={[styles.choix, actif && styles.choixActif]}
            >
              <Text style={[styles.choixTexte, actif && styles.choixTexteActif]}>
                {TRAITS[t].label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.legende}>
        La même humeur, dite autrement. Touche la plante sur l’accueil pour l’entendre.
      </Text>
    </Verre>
  );
}

export default function Reglages() {
  const etatConnexion = usePlante((etat) => etat.etatConnexion);
  // Deux questions séparées, comme dans le corrigé : la base répond-elle
  // (/health, sans jeton), et le jeton est-il accepté (checkInflux).
  // retry: false : un jeton refusé s'affiche tout de suite.
  const sante = useQuery({
    queryKey: ['influx', 'health'],
    queryFn: ({ signal }) => fetchInfluxHealth(signal),
  });
  const jeton = useQuery({
    queryKey: ['influx', 'jeton'],
    queryFn: ({ signal }) => checkInflux(signal),
    retry: false,
  });

  // isPending : aucune réponse encore. fetchStatus « paused » : pas de
  // réseau, la requête attend son retour au lieu d'échouer.
  let etatBase = 'vérification…';
  if (sante.fetchStatus === 'paused') etatBase = 'pas de réseau, en attente';
  else if (sante.isError) etatBase = sante.error.message;
  else if (sante.isSuccess) etatBase = sante.data ? 'en ligne' : 'répond, mais signale un problème';

  let etatJeton = CONFIG.influxToken ? 'vérification…' : 'absent';
  if (jeton.fetchStatus === 'paused') etatJeton = 'en attente du réseau';
  else if (jeton.isError) etatJeton = jeton.error.message;
  else if (jeton.isSuccess) etatJeton = 'accepté';

  const verifiee = sante.dataUpdatedAt ? heure(sante.dataUpdatedAt) : 'jamais';
  const enCours = sante.isFetching || jeton.isFetching;
  const reverifier = () => {
    void sante.refetch();
    void jeton.refetch();
  };

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

        <Caractere />

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
          <Ligne etiquette="État" valeur={etatBase} />
          <Ligne etiquette="Jeton" valeur={etatJeton} />
          <Ligne etiquette="Vérifiée" valeur={verifiee} />
          <Ligne etiquette="Serveur" valeur={hote(CONFIG.influxUrl)} />
          <Ligne etiquette="Organisation" valeur={CONFIG.influxOrg || 'absente'} />
          <Ligne etiquette="Bucket" valeur={CONFIG.influxBucket || 'absent'} />
          <Pressable
            onPress={reverifier}
            disabled={enCours}
            accessibilityRole="button"
            style={styles.bouton}
          >
            <Text style={styles.boutonTexte}>
              {enCours ? 'Requête en cours…' : 'Revérifier'}
            </Text>
          </Pressable>
          <Text style={styles.legende}>
            Le jeton ne s’affiche jamais, et ne part jamais dans Git. L’historique filtre sur
            l’identifiant de binôme de la carte du broker.
          </Text>
        </Verre>

        <CommandesCarte />

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
  boutonsLigne: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACES.petit },
  bouton: {
    marginTop: ESPACES.petit,
    alignSelf: 'flex-start',
    paddingVertical: ESPACES.petit,
    paddingHorizontal: ESPACES.moyen,
    borderRadius: RAYONS.bouton,
    borderWidth: 1,
    borderColor: COULEURS.filet,
  },
  boutonTexte: { fontSize: 14, fontWeight: '600', color: COULEURS.texte },
  legende: { marginTop: ESPACES.petit, fontSize: 13, lineHeight: 18, color: COULEURS.gris },
});
