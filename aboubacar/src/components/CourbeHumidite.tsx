import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { FICHE } from '../lib/fiche';
import { splitIntoSegments, type HistoryPoint, type SegmentPoint } from '../lib/influx';
import { COULEURS, ESPACES } from '../lib/theme';

// =====================================================================
//  La courbe d'humidité de l'historique.
//  Règles de l'étape 6, tenues ici : un Path par segment (jamais un trait
//  au-dessus d'un trou), axe y fixe de 0 à 100 %, graduations à gauche.
//  Le reste est du soin : zone de confort de la fiche, aire en dégradé
//  sous chaque morceau, dernier point marqué, doigt qui lit les valeurs.
// =====================================================================

const HAUTEUR = 220;
const MARGE_GAUCHE = 34;
const MARGE_HAUT = 10;
const MARGE_BAS = 24;
const GRADUATIONS = [0, 50, 100];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

type Props = {
  points: HistoryPoint[];
  /** Fin de l'axe des temps : query.dataUpdatedAt. */
  fin: number;
  durationMs: number;
  everyMs: number;
};

/** M sur le premier point, L vers chacun des suivants. */
function toPath(
  segment: SegmentPoint[],
  x: (time: number) => number,
  y: (value: number) => number,
): string {
  return segment
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');
}

/** Le même chemin, refermé sur la ligne du 0 % : l'aire sous ce morceau seulement. */
function toAire(
  segment: SegmentPoint[],
  x: (time: number) => number,
  y: (value: number) => number,
): string {
  const premier = segment[0];
  const dernier = segment[segment.length - 1];
  return `${toPath(segment, x, y)} L${x(dernier.time).toFixed(1)},${y(0)} L${x(premier.time).toFixed(1)},${y(0)} Z`;
}

function deuxChiffres(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Libellé d'instant : l'heure sur un jour, le jour au-delà. Heure locale du téléphone. */
function libelleTemps(time: number, durationMs: number): string {
  const d = new Date(time);
  if (durationMs <= 24 * 3600 * 1000) return `${deuxChiffres(d.getHours())}h${deuxChiffres(d.getMinutes())}`;
  return `${JOURS[d.getDay()]} ${d.getDate()}`;
}

/** Libellé précis du point lu sous le doigt : le jour en plus au-delà d'un jour. */
function libelleInstant(time: number, durationMs: number): string {
  const d = new Date(time);
  const heure = `${deuxChiffres(d.getHours())}h${deuxChiffres(d.getMinutes())}`;
  if (durationMs <= 24 * 3600 * 1000) return heure;
  return `${JOURS[d.getDay()]} ${d.getDate()} · ${heure}`;
}

export function CourbeHumidite({ points, fin, durationMs, everyMs }: Props) {
  const [largeur, setLargeur] = useState(0);
  const [doigtX, setDoigtX] = useState<number | null>(null);

  const segments = splitIntoSegments(points, 'humidity', everyMs);
  const valeurs = segments.flat();
  const dernier = valeurs[valeurs.length - 1];

  const debut = fin - durationMs;
  const largeurTrace = Math.max(largeur - MARGE_GAUCHE, 1);
  const hauteurTrace = HAUTEUR - MARGE_HAUT - MARGE_BAS;
  const x = (time: number) => MARGE_GAUCHE + ((time - debut) / durationMs) * largeurTrace;
  const y = (value: number) => MARGE_HAUT + (1 - value / 100) * hauteurTrace;

  // Le point lu sous le doigt : le plus proche en temps, parmi les vrais
  // points. Dans un trou, on ne lit rien plutôt que d'inventer.
  let lu: SegmentPoint | null = null;
  if (doigtX !== null && valeurs.length > 0) {
    const tempsDoigt = debut + ((doigtX - MARGE_GAUCHE) / largeurTrace) * durationMs;
    let meilleur = valeurs[0];
    for (const p of valeurs) {
      if (Math.abs(p.time - tempsDoigt) < Math.abs(meilleur.time - tempsDoigt)) meilleur = p;
    }
    if (Math.abs(meilleur.time - tempsDoigt) <= everyMs) lu = meilleur;
  }

  const affiche = lu ?? dernier;
  const min = Math.min(...valeurs.map((p) => p.value));
  const max = Math.max(...valeurs.map((p) => p.value));
  const moyenne = valeurs.reduce((s, p) => s + p.value, 0) / Math.max(valeurs.length, 1);
  const { bas, haut } = FICHE.seuils;
  const dansLaZone = affiche ? affiche.value >= bas && affiche.value <= haut : false;

  const suivreDoigt = (xDoigt: number) =>
    setDoigtX(Math.min(Math.max(xDoigt, MARGE_GAUCHE), largeur));

  return (
    <View>
      {/* En-tête : la valeur lue (sous le doigt, sinon la dernière). */}
      <View style={styles.entete}>
        <View>
          <Text style={styles.surtitre}>HUMIDITÉ DU SOL</Text>
          <Text style={styles.valeur}>
            {affiche ? Math.round(affiche.value) : '–'}
            <Text style={styles.unite}> %</Text>
          </Text>
        </View>
        <View style={styles.enteteDroite}>
          <Text style={styles.quand}>
            {lu ? libelleInstant(lu.time, durationMs) : 'Dernière mesure'}
          </Text>
          {affiche && (
            <View style={[styles.pastille, !dansLaZone && styles.pastilleHors]}>
              <Text style={styles.pastilleTexte}>
                {dansLaZone ? '● dans la zone' : affiche.value < bas ? '▼ trop sec' : '▲ trop humide'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View
        onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => suivreDoigt(e.nativeEvent.locationX)}
        onResponderMove={(e) => suivreDoigt(e.nativeEvent.locationX)}
        onResponderRelease={() => setDoigtX(null)}
        onResponderTerminate={() => setDoigtX(null)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Courbe d'humidité du sol. Dernière mesure ${dernier ? Math.round(dernier.value) : 'absente'} %, minimum ${Math.round(min)} %, maximum ${Math.round(max)} %.`}
      >
        {largeur > 0 && (
          <Svg width={largeur} height={HAUTEUR}>
            <Defs>
              <LinearGradient id="aire" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={COULEURS.accent} stopOpacity={0.32} />
                <Stop offset="1" stopColor={COULEURS.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {/* Zone de confort de la fiche : là où la plante est bien. */}
            <Rect
              x={MARGE_GAUCHE}
              y={y(haut)}
              width={largeurTrace}
              height={y(bas) - y(haut)}
              fill={COULEURS.tacheSauge}
              opacity={0.28}
            />

            {GRADUATIONS.map((v) => (
              <Line
                key={`g-${v}`}
                x1={MARGE_GAUCHE}
                x2={largeur}
                y1={y(v)}
                y2={y(v)}
                stroke={COULEURS.filet}
                strokeWidth={1}
                strokeDasharray={v === 0 ? undefined : '2 5'}
              />
            ))}
            {GRADUATIONS.map((v) => (
              <SvgText
                key={`t-${v}`}
                x={MARGE_GAUCHE - 8}
                y={y(v) + 4}
                fontSize={11}
                fill={COULEURS.gris}
                textAnchor="end"
              >
                {`${v} %`}
              </SvgText>
            ))}

            {/* Un morceau, une aire et un trait : rien au-dessus des trous. */}
            {segments.map((s, i) =>
              s.length > 1 ? <Path key={`a-${i}`} d={toAire(s, x, y)} fill="url(#aire)" /> : null,
            )}
            {segments.map((s, i) =>
              s.length > 1 ? (
                <Path
                  key={`l-${i}`}
                  d={toPath(s, x, y)}
                  stroke={COULEURS.accent}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                // Un morceau d'un seul point n'a pas de longueur : un point le montre.
                <Circle key={`l-${i}`} cx={x(s[0].time)} cy={y(s[0].value)} r={2.5} fill={COULEURS.accent} />
              ),
            )}

            {/* Le dernier point, cerclé de la couleur du fond pour se détacher. */}
            {dernier && !lu && (
              <>
                <Circle cx={x(dernier.time)} cy={y(dernier.value)} r={10} fill={COULEURS.accent} opacity={0.15} />
                <Circle
                  cx={x(dernier.time)}
                  cy={y(dernier.value)}
                  r={5}
                  fill={COULEURS.accent}
                  stroke={COULEURS.carte}
                  strokeWidth={2}
                />
              </>
            )}

            {/* Le doigt : une règle verticale et le point lu. */}
            {lu && (
              <>
                <Line
                  x1={x(lu.time)}
                  x2={x(lu.time)}
                  y1={MARGE_HAUT}
                  y2={y(0)}
                  stroke={COULEURS.texte}
                  strokeWidth={1}
                  opacity={0.35}
                />
                <Circle
                  cx={x(lu.time)}
                  cy={y(lu.value)}
                  r={5}
                  fill={COULEURS.carte}
                  stroke={COULEURS.accent}
                  strokeWidth={2.5}
                />
              </>
            )}

            {/* Trois repères de temps sous l'axe. */}
            {[debut, debut + durationMs / 2].map((t, i) => (
              <SvgText
                key={`x-${i}`}
                x={x(t)}
                y={HAUTEUR - 6}
                fontSize={11}
                fill={COULEURS.gris}
                textAnchor={i === 0 ? 'start' : 'middle'}
              >
                {libelleTemps(t, durationMs)}
              </SvgText>
            ))}
            <SvgText x={largeur} y={HAUTEUR - 6} fontSize={11} fill={COULEURS.gris} textAnchor="end">
              maintenant
            </SvgText>
          </Svg>
        )}
      </View>

      {/* Légende : chaque marque est nommée, la couleur ne parle pas seule. */}
      <View style={styles.legende}>
        <View style={styles.legendeItem}>
          <View style={styles.legendeTrait} />
          <Text style={styles.legendeTexte}>Humidité</Text>
        </View>
        <View style={styles.legendeItem}>
          <View style={styles.legendeZone} />
          <Text style={styles.legendeTexte}>
            Confort {bas}–{haut} %
          </Text>
        </View>
        {segments.length > 1 && (
          <Text style={styles.legendeTexte}>
            {segments.length - 1} {segments.length > 2 ? 'trous' : 'trou'}
          </Text>
        )}
      </View>

      <View style={styles.stats}>
        {[
          ['Min', min],
          ['Moyenne', moyenne],
          ['Max', max],
        ].map(([libelle, v]) => (
          <View key={libelle} style={styles.stat}>
            <Text style={styles.statLibelle}>{libelle}</Text>
            <Text style={styles.statValeur}>{Math.round(v as number)} %</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: ESPACES.moyen,
  },
  surtitre: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, color: COULEURS.gris },
  valeur: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    color: COULEURS.texte,
    fontVariant: ['tabular-nums'],
  },
  unite: { fontSize: 22, fontWeight: '600', letterSpacing: 0, color: COULEURS.gris },
  enteteDroite: { alignItems: 'flex-end', gap: 6, paddingBottom: 10 },
  quand: { fontSize: 13, color: COULEURS.gris, fontVariant: ['tabular-nums'] },
  pastille: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(63, 125, 58, 0.12)',
  },
  pastilleHors: { backgroundColor: 'rgba(31, 42, 28, 0.08)' },
  pastilleTexte: { fontSize: 12, fontWeight: '700', color: COULEURS.texte },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: ESPACES.moyen,
    marginTop: ESPACES.petit,
  },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendeTrait: { width: 16, height: 3, borderRadius: 2, backgroundColor: COULEURS.accent },
  legendeZone: { width: 16, height: 10, borderRadius: 3, backgroundColor: COULEURS.tacheSauge },
  legendeTexte: { fontSize: 12, color: COULEURS.gris },
  stats: {
    flexDirection: 'row',
    marginTop: ESPACES.moyen,
    paddingTop: ESPACES.moyen,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COULEURS.filet,
  },
  stat: { flex: 1 },
  statLibelle: { fontSize: 12, color: COULEURS.gris },
  statValeur: { fontSize: 20, fontWeight: '700', color: COULEURS.texte, fontVariant: ['tabular-nums'] },
});
