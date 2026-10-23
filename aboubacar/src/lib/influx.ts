import { CONFIG } from "./config";

export type Period = "day" | "week" | "fortnight";

const MINUTE = 60 * 1000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

export const PERIODS = {
  day: {
    label: "Jour",
    /** Début Flux, recopié tel quel dans range(start: …). */
    start: "-24h",
    /** Pas Flux, recopié tel quel dans aggregateWindow(every: …). */
    every: "10m",
    /** Le même pas en millisecondes : l'écart attendu entre deux points. */
    everyMs: 10 * MINUTE,
    /** La largeur totale de l'axe du temps. */
    durationMs: JOUR,
  },
  week: {
    label: "Semaine",
    start: "-7d",
    every: "1h",
    everyMs: HEURE,
    durationMs: 7 * JOUR,
  },
  fortnight: {
    label: "Quinzaine",
    start: "-14d",
    every: "2h",
    everyMs: 2 * HEURE,
    durationMs: 14 * JOUR,
  },
} as const satisfies Record<
  Period,
  {
    label: string;
    start: string;
    every: string;
    everyMs: number;
    durationMs: number;
  }
>;

export type HistoryPoint = {
  /** La colonne _time, en millisecondes depuis 1970 (Date.parse). */
  time: number;
  /** Humidité du sol, en %. */
  humidity: number | null;
  /** Température, en °C. */
  temperature: number | null;
  /** Lumière, en %. */
  light: number | null;
};

/**
 * Ne garde que lettres, chiffres, tiret, point, deux-points et souligné.
 * pairId et bucket viennent du .env : un guillemet glissé dedans fermerait
 * la chaîne Flux et permettrait d'écrire la suite de la requête.
 */
/** L'adresse de la base sans barre finale : « …/ » suivi de « /api » donnerait « //api ». */
function baseUrl(): string {
  return CONFIG.influxUrl.replace(/\/+$/, "");
}

function sanitize(value: string): string {
  return value.replace(/[^A-Za-z0-9_.:-]/g, "");
}

/**
 * La requête Flux de l'étape 1, pour une période donnée.
 * L'ordre compte : filtrer sur le binôme AVANT aggregateWindow, sinon la
 * moyenne porte sur toute la promo et la courbe reste plausible.
 */
export function buildHistoryQuery(bucket: string, pairId: string, period: Period): string {
  const { start, every } = PERIODS[period];
  return [
    `from(bucket: "${sanitize(bucket)}")`,
    `  |> range(start: ${start})`,
    `  |> filter(fn: (r) => r._measurement == "plante")`,
    `  |> filter(fn: (r) => r.binome == "${sanitize(pairId)}")`,
    `  |> filter(fn: (r) => r._field == "humidite" or r._field == "temperature" or r._field == "lumiere")`,
    `  |> group(columns: ["_field"])`,
    `  |> aggregateWindow(every: ${every}, fn: mean, createEmpty: false)`,
    `  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")`,
  ].join("\n");
}

/**
 * Une case du CSV en nombre. Case vide ou illisible : null, jamais 0.
 * Le test du vide vient AVANT la conversion : Number('') vaut 0, et un
 * 0 dessine une plante complètement sèche au milieu de la courbe.
 */
function toNumber(cell: string | undefined): number | null {
  if (cell === undefined || cell.trim() === "") return null;
  const value = Number.parseFloat(cell);
  return Number.isFinite(value) ? value : null;
}

/**
 * Lit la réponse CSV d'InfluxDB et rend un point par ligne de données.
 * Une ligne vide ou une annotation (#…) termine une table : la ligne
 * suivante donne de nouveaux en-têtes. Les colonnes sont retrouvées par
 * leur nom, jamais par leur position.
 */
export function parseInfluxCsv(csv: string): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  let headers: string[] | null = null;

  // InfluxDB termine ses lignes par \r\n : le \r resterait collé à la
  // dernière colonne, et "temperature\r" ne serait jamais trouvé.
  for (const line of csv.split(/\r?\n/)) {
    if (line.trim() === "" || line.startsWith("#")) {
      headers = null;
      continue;
    }

    const cells = line.split(",");
    if (headers === null) {
      headers = cells;
      continue;
    }

    const columns = headers;
    const cell = (name: string) => {
      const index = columns.indexOf(name);
      return index === -1 ? undefined : cells[index];
    };

    const time = Date.parse(cell("_time") ?? "");
    if (Number.isNaN(time)) continue;

    points.push({
      time,
      humidity: toNumber(cell("humidite")),
      temperature: toNumber(cell("temperature")),
      light: toNumber(cell("lumiere")),
    });
  }

  // Plusieurs tables peuvent se suivre dans la réponse : on remet tout
  // dans l'ordre du temps, la courbe se trace de gauche à droite.
  return points.sort((a, b) => a.time - b.time);
}

/**
 * Demande l'historique d'un binôme sur une période et le rend trié.
 * Le signal vient d'un AbortController : changer de période ou quitter
 * l'écran annule la requête en cours au lieu d'attendre sa réponse.
 */
export async function fetchHistory(
  pairId: string,
  period: Period,
  signal?: AbortSignal,
): Promise<HistoryPoint[]> {
  // Une variable absente du .env vaut '' : sans ce test, fetch partirait
  // vers une adresse vide et l'erreur ne parlerait pas du .env.
  if (!CONFIG.influxUrl) {
    throw new Error(
      "Aucune adresse InfluxDB. Renseigne EXPO_PUBLIC_INFLUX_URL dans le fichier .env, puis recharge l'application (touche r).",
    );
  }
  if (!CONFIG.influxToken) {
    throw new Error(
      "Aucun jeton InfluxDB. Renseigne EXPO_PUBLIC_INFLUX_TOKEN dans le fichier .env, puis recharge l'application (touche r).",
    );
  }

  const response = await fetch(
    `${baseUrl()}/api/v2/query?org=${encodeURIComponent(CONFIG.influxOrg)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${CONFIG.influxToken}`,
        "Content-Type": "application/vnd.flux",
        Accept: "application/csv",
      },
      body: buildHistoryQuery(CONFIG.influxBucket, pairId, period),
      signal,
    },
  );

  // Sans ce test, le message d'erreur JSON du serveur passerait dans
  // parseInfluxCsv, qui rendrait [] : une courbe vide, sans explication.
  if (response.status === 401) {
    throw new Error(
      "Jeton InfluxDB refusé. Vérifie EXPO_PUBLIC_INFLUX_TOKEN dans le fichier .env.",
    );
  }
  if (!response.ok) {
    throw new Error(`InfluxDB a répondu ${response.status}.`);
  }
  return parseInfluxCsv(await response.text());
}

/**
 * Vérifie que la base répond ET que le jeton est accepté, pour la carte
 * des réglages. /health répondrait même avec un jeton faux : on demande
 * plutôt la liste des buckets, qui exige un jeton valide.
 */
export async function checkInflux(signal?: AbortSignal): Promise<"en ligne"> {
  if (!CONFIG.influxUrl || !CONFIG.influxToken) {
    throw new Error("Adresse ou jeton absent du fichier .env.");
  }
  const response = await fetch(`${baseUrl()}/api/v2/buckets?limit=1`, {
    headers: { Authorization: `Token ${CONFIG.influxToken}` },
    signal,
  });
  if (response.status === 401) throw new Error("Jeton InfluxDB refusé.");
  if (!response.ok) throw new Error(`InfluxDB a répondu ${response.status}.`);
  return "en ligne";
}

/** Une grandeur de HistoryPoint, celle qu'on veut tracer. */
export type HistoryField = "humidity" | "temperature" | "light";

/** Un point d'un segment : un instant, une valeur, jamais null. */
export type SegmentPoint = { time: number; value: number };

/** Le nom du corrigé pour le même type. */
export type ChartPoint = SegmentPoint;

/**
 * Coupe la série en morceaux continus, un chemin SVG par morceau.
 * Deux raisons de couper : une valeur null, ou un écart de plus d'une
 * fois et demie le pas avec le point précédent (createEmpty: false ne
 * rend rien pour une fenêtre vide, le trou ne se voit qu'au temps).
 * Sans ça, un seul chemin relierait les deux bords d'une nuit
 * débranchée par une droite : des mesures qui n'ont jamais existé.
 */
export function splitIntoSegments(
  points: HistoryPoint[],
  field: HistoryField,
  everyMs: number,
): SegmentPoint[][] {
  const segments: SegmentPoint[][] = [];
  let courant: SegmentPoint[] = [];
  let tempsPrecedent: number | null = null;

  for (const point of points) {
    const value = point[field];
    const trou =
      value === null ||
      (tempsPrecedent !== null && point.time - tempsPrecedent > 1.5 * everyMs);

    if (trou && courant.length > 0) {
      segments.push(courant);
      courant = [];
    }
    if (value !== null) {
      courant.push({ time: point.time, value });
      tempsPrecedent = point.time;
    } else {
      tempsPrecedent = null;
    }
  }
  if (courant.length > 0) segments.push(courant);

  return segments;
}

/**
 * La santé de la base, sans jeton : /health répond un petit JSON dont le
 * champ status vaut « pass » quand InfluxDB va bien. Ne dit rien du
 * jeton : checkInflux, lui, le vérifie.
 */
export async function fetchInfluxHealth(signal?: AbortSignal): Promise<boolean> {
  if (!CONFIG.influxUrl) throw new Error("EXPO_PUBLIC_INFLUX_URL absent du .env.");
  const response = await fetch(`${baseUrl()}/health`, { signal });
  if (!response.ok) throw new Error(`La base a répondu ${response.status}.`);
  const body: unknown = await response.json();
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { status?: unknown }).status === "pass"
  );
}

/**
 * Moyenne glissante sur un segment, size points de large.
 * Calculée dans le téléphone, et c'est permis : elle porte sur les
 * quelques centaines de points déjà agrégés, pas sur les mesures
 * brutes. Elle ne traverse jamais un trou, puisqu'elle travaille
 * segment par segment.
 */
export function movingAverage(segment: SegmentPoint[], size: number): SegmentPoint[] {
  return segment.map((point, index) => {
    const fenetre = segment.slice(Math.max(0, index - size + 1), index + 1);
    const somme = fenetre.reduce((total, p) => total + p.value, 0);
    return { time: point.time, value: somme / fenetre.length };
  });
}

/**
 * Compte les oublis d'arrosage : le nombre de fois où l'humidité passe
 * SOUS le seuil bas. Un passage, pas un point : une plante restée
 * assoiffée trois jours compte pour un oubli, pas pour trente-six.
 */
export function countDryPeriods(segments: SegmentPoint[][], threshold: number): number {
  let count = 0;
  for (const segment of segments) {
    let etaitSec = false;
    for (const point of segment) {
      const estSec = point.value < threshold;
      if (estSec && !etaitSec) count += 1;
      etaitSec = estSec;
    }
  }
  return count;
}
