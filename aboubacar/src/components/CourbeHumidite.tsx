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

import type { Seuils } from '../lib/contrat';
import { FICHE } from '../lib/fiche';
import {
  countDryPeriods,
  movingAverage,
  PERIODS,
  splitIntoSegments,
  type HistoryPoint,
  type Period,
  type SegmentPoint,
} from '../lib/influx';
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
/** Six points de large : une demi-journée en vue Quinzaine, une heure en vue Jour. */
const AVERAGE_SIZE = 6;

type Props = {
  points: HistoryPoint[];
  /** Fin de l'axe des temps : query.dataUpdatedAt. */
  fin: number;
  period: Period;
  /** Séance 6 · la zone de confort tracée. Par défaut, celle de ta fiche. */
  seuils?: Seuils;
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

/**
 * L'axe du temps de chaque période (corrigé) : une graduation toutes les
 * everyHours heures, et la façon de l'écrire. Fait à la main plutôt
 * qu'avec Intl, dont le support varie selon le moteur JS.
 */
const TIME_AXIS: Record<Period, { everyHours: number; format: (d: Date) => string }> = {
  day: { everyHours: 6, format: (d) => `${deuxChiffres(d.getHours())} h` },
  week: { everyHours: 24, format: (d) => JOURS[d.getDay()] },
  fortnight: {
    everyHours: 48,
    format: (d) => `${deuxChiffres(d.getDate())}/${deuxChiffres(d.getMonth() + 1)}`,
  },
};

/**
 * Les instants des graduations entre start et end, calés sur des heures
 * rondes (ou sur minuit pour les graduations en jours), en heure locale.
 * On avance avec setHours : un changement d'heure ne décale rien.
 */
function timeTicks(start: number, end: number, everyHours: number): number[] {
  const d = new Date(start);
  d.setMinutes(0, 0, 0);
  d.setHours(everyHours >= 24 ? 0 : Math.ceil(d.getHours() / everyHours) * everyHours);
  const ticks: number[] = [];
  while (d.getTime() <= end) {
    if (d.getTime() >= start) ticks.push(d.getTime());
    d.setHours(d.getHours() + everyHours);
  }
  return ticks;
}

/** Libellé précis du point lu sous le doigt : le jour en plus au-delà d'un jour. */
function libelleInstant(time: number, durationMs: number): string {
  const d = new Date(time);
  const heure = `${deuxChiffres(d.getHours())}h${deuxChiffres(d.getMinutes())}`;
  if (durationMs <= 24 * 3600 * 1000) return heure;
  return `${JOURS[d.getDay()]} ${d.getDate()} · ${heure}`;
}

export function CourbeHumidite({ points, fin, period, seuils = FICHE.seuils }: Props) {
  const { durationMs, everyMs, every } = PERIODS[period];
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
  const { bas, haut } = seuils;
  const dansLaZone = affiche ? affiche.value >= bas && affiche.value <= haut : false;

  // La moyenne glissante, calculée segment par segment : elle ne
  // traverse jamais un trou. Les oublis d'arrosage : les passages SOUS
  // le seuil bas, un passage comptant pour un oubli.
  const moyennes = segments.map((s) => movingAverage(s, AVERAGE_SIZE));
  const oublis = countDryPeriods(segments, bas);

  // Les graduations trop près des bords sont écartées : leur texte,
  // centré sur l'instant, déborderait du dessin.
  const axe = TIME_AXIS[period];
  const ticks = timeTicks(debut, fin, axe.everyHours).filter(
    (t) => x(t) > MARGE_GAUCHE + 14 && x(t) < largeur - 14,
  );

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
            {/* Le seuil bas de l'espèce, en pointillés. */}
            <Line
              x1={MARGE_GAUCHE}
              x2={largeur}
              y1={y(bas)}
              y2={y(bas)}
              stroke={COULEURS.gris}
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Les mesures, en trait fin : le détail, trou compris. */}
            {segments.map((s, i) =>
              s.length > 1 ? (
                <Path
                  key={`l-${i}`}
                  d={toPath(s, x, y)}
                  stroke={COULEURS.texte}
                  strokeOpacity={0.45}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : (
                // Un morceau d'un seul point n'a pas de longueur : un point le montre.
                <Circle key={`l-${i}`} cx={x(s[0].time)} cy={y(s[0].value)} r={2.5} fill={COULEURS.texte} />
              ),
            )}
            {/* La moyenne glissante, en trait épais : la tendance. */}
            {moyennes.map((s, i) =>
              s.length > 1 ? (
                <Path
                  key={`m-${i}`}
                  d={toPath(s, x, y)}
                  stroke={COULEURS.accent}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null,
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

            {/* L'axe du temps : un repère et une date par graduation. */}
            {ticks.map((t) => (
              <Line
                key={`tick-${t}`}
                x1={x(t)}
                x2={x(t)}
                y1={y(0)}
                y2={y(0) + 4}
                stroke={COULEURS.gris}
              />
            ))}
            {ticks.map((t) => (
              <SvgText
                key={`date-${t}`}
                x={x(t)}
                y={HAUTEUR - 6}
                fontSize={11}
                fill={COULEURS.gris}
                textAnchor="middle"
              >
                {axe.format(new Date(t))}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      {/* Légende : chaque marque est nommée, la couleur ne parle pas seule. */}
      <View style={styles.legende}>
        <View style={styles.legendeItem}>
          <View style={styles.legendeMesure} />
          <Text style={styles.legendeTexte}>Mesure, moyenne par {every}</Text>
        </View>
        <View style={styles.legendeItem}>
          <View style={styles.legendeTrait} />
          <Text style={styles.legendeTexte}>Tendance</Text>
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
      <Text style={styles.bilan}>
        {oublis === 0
          ? `Aucun passage sous ${bas} % sur la période.`
          : `${oublis} passage${oublis > 1 ? 's' : ''} sous ${bas} % : ${oublis > 1 ? 'autant' : 'un'} oubli${oublis > 1 ? 's' : ''} d'arrosage.`}
      </Text>
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
  legendeMesure: { width: 16, height: 2, borderRadius: 1, backgroundColor: COULEURS.texte, opacity: 0.45 },
  legendeTrait: { width: 16, height: 3, borderRadius: 2, backgroundColor: COULEURS.accent },
  legendeZone: { width: 16, height: 10, borderRadius: 3, backgroundColor: COULEURS.tacheSauge },
  legendeTexte: { fontSize: 12, color: COULEURS.gris },
  bilan: { marginTop: ESPACES.moyen, fontSize: 14, lineHeight: 20, color: COULEURS.texte },
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
