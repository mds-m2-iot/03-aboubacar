// =====================================================================
//  app/carte.tsx · la carte des plantes de la classe, avec Mapbox
// =====================================================================
//  Séance 6, « La carte des plantes ».
//
//  La carte est NATIVE : @rnmapbox/maps affiche les cartes Mapbox avec
//  le moteur du téléphone, pas dans une page web. Les points sont des
//  couches Mapbox nourries par un GeoJSON : une liste de points, chacun
//  avec ses propriétés (couleur, libellé). Mapbox les dessine lui-même.
//
//  Effet de bord heureux : le libellé est rendu comme du TEXTE par le
//  moteur de la carte, jamais interprété comme du HTML. Le nom piégé
//  qu'une page web aurait exécuté s'affiche ici tel quel, sans danger.
//
//  Ta plante se place À LA MAIN : tu touches la carte, ou tu tapes ses
//  coordonnées, et la position est arrondie au quartier. Rien ne part
//  sans ton consentement. La position réelle du téléphone n'est jamais
//  demandée.
// =====================================================================
import Mapbox, {
  Camera,
  CircleLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMaintenant } from "../../lib/affichage";
import { CONFIG } from "../../lib/config";
import { SEUILS_DEFAUT } from "../../lib/contrat";
import { FICHE } from "../../lib/fiche";
import {
  couleurHumeur,
  etatAffiche,
  libelleHumeur,
  mesureConsolidee,
} from "../../lib/humeur";
import { buildPlace, MAP_CENTER, roundCoordinate } from "../../lib/place";
import { COULEURS, ESPACES, RAYONS } from "../../lib/theme";
import { useMap } from "../../store/map";
import { usePlante } from "../../store/plante";
import { usePlants } from "../../store/plants";

// Le jeton PUBLIC (pk.…) suffit pour afficher une carte. Il est lu une
// fois, au chargement du module : sans lui, Mapbox n'affiche rien.
if (CONFIG.mapboxToken) void Mapbox.setAccessToken(CONFIG.mapboxToken);

/** Le style des cartes Mapbox : les rues, en version 12. */
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

type Point = { lat: number; lon: number };

export default function Carte() {
  const places = useMap((s) => s.places);
  const measures = useMap((s) => s.measures);
  const publishPlace = useMap((s) => s.publishPlace);
  const mesures = usePlante((s) => s.mesures);
  const followed = usePlants((s) => s.plants);
  const maintenant = useMaintenant(5000);

  const [draft, setDraft] = useState<Point | null>(null);
  const [consent, setConsent] = useState(false);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [latText, setLatText] = useState("");
  const [lonText, setLonText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // On n'écoute les mesures de toute la classe que pendant que la carte
  // est à l'écran : useFocusEffect s'allume en entrant, s'éteint en sortant.
  useFocusEffect(
    useCallback(() => {
      useMap.getState().setWatching(true);
      return () => useMap.getState().setWatching(false);
    }, []),
  );

  // Le GeoJSON des plantes : un point par plante qui a publié son lieu,
  // coloré par son humeur. Ta plante prend TES seuils et TES mesures ; les
  // autres, les seuils du contrat. Le bonus « mes plantes seulement »
  // filtre sur la liste choisie.
  const ownMeasure = useMemo(() => mesureConsolidee(mesures), [mesures]);
  const plantsShape = useMemo<GeoJSON.FeatureCollection>(() => {
    const keep = new Set(followed.map((p) => p.id));
    const features: GeoJSON.Feature[] = Object.entries(places)
      .filter(([id]) => !onlyFollowed || id === CONFIG.idBinome || keep.has(id))
      .map(([id, place]) => {
        const own = id === CONFIG.idBinome;
        const seuils = SEUILS_DEFAUT;
        const mood = own
          ? etatAffiche(ownMeasure, FICHE.seuils, maintenant)
          : etatAffiche(measures[id] ?? null, seuils, maintenant);
        return {
          type: "Feature",
          id,
          geometry: { type: "Point", coordinates: [place.lon, place.lat] },
          properties: {
            color: couleurHumeur(mood),
            label: `${place.nom || id} · ${libelleHumeur(mood)}`,
          },
        };
      });
    return { type: "FeatureCollection", features };
  }, [places, measures, followed, onlyFollowed, ownMeasure, maintenant]);

  const draftShape = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: draft
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [draft.lon, draft.lat] },
            },
          ]
        : [],
    }),
    [draft],
  );

  /** Un toucher sur la carte : Mapbox rend [longitude, latitude], dans cet ordre. */
  function onMapPress(feature: GeoJSON.Feature<GeoJSON.Point>): void {
    const [lon, lat] = feature.geometry.coordinates;
    choose(lat, lon);
  }

  function choose(lat: number, lon: number): void {
    const rounded = { lat: roundCoordinate(lat), lon: roundCoordinate(lon) };
    setDraft(rounded);
    setLatText(String(rounded.lat));
    setLonText(String(rounded.lon));
  }

  /** Bonus de la séance 6 : les coordonnées tapées à la main, arrondies pareil. */
  function chooseTyped(): void {
    const lat = Number.parseFloat(latText.replace(",", "."));
    const lon = Number.parseFloat(lonText.replace(",", "."));
    if (buildPlace(lat, lon, "")) choose(lat, lon);
    else
      setMessage(
        "Coordonnées impossibles : la latitude va de -90 à 90, la longitude de -180 à 180.",
      );
  }

  function placer(): void {
    if (!draft || !consent) return;
    const place = buildPlace(draft.lat, draft.lon, FICHE.nom);
    setMessage(
      place && publishPlace?.(place)
        ? "Ta plante est sur la carte."
        : "Pas de connexion au broker. Vérifie que la source est « Broker MQTT ».",
    );
  }

  function retirer(): void {
    setMessage(
      publishPlace?.(null)
        ? "Ta plante est retirée de la carte, pour tout le monde."
        : "Pas de connexion au broker.",
    );
  }

  return (
    // edges bas aussi : la barre d'onglets native flotte au-dessus du
    // contenu, sans cette marge elle cache les boutons « Placer ».
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <Text style={styles.titre}>La carte des plantes</Text>
      <View style={styles.filet} />

      <View style={styles.carteMap}>
        {CONFIG.mapboxToken ? (
          <MapView
            style={styles.map}
            styleURL={MAP_STYLE}
            onPress={onMapPress}
            scaleBarEnabled={false}
          >
            <Camera
              defaultSettings={{
                centerCoordinate: [MAP_CENTER.lon, MAP_CENTER.lat],
                zoomLevel: MAP_CENTER.zoom,
              }}
            />
            <ShapeSource id="plantes" shape={plantsShape}>
              <CircleLayer
                id="plantes-points"
                style={{
                  circleRadius: 11,
                  circleColor: ["get", "color"],
                  circleStrokeColor: COULEURS.texte,
                  circleStrokeWidth: 2,
                }}
              />
              <SymbolLayer
                id="plantes-noms"
                style={{
                  textField: ["get", "label"],
                  textSize: 12,
                  textOffset: [0, -1.6],
                  textAnchor: "bottom",
                  textColor: COULEURS.texte,
                  textHaloColor: COULEURS.carte,
                  textHaloWidth: 1.5,
                }}
              />
            </ShapeSource>
            <ShapeSource id="brouillon" shape={draftShape}>
              <CircleLayer
                id="brouillon-zone"
                style={{
                  circleRadius: 26,
                  circleColor: COULEURS.accent,
                  circleOpacity: 0.25,
                  circleStrokeColor: COULEURS.accent,
                  circleStrokeWidth: 2,
                }}
              />
            </ShapeSource>
          </MapView>
        ) : (
          <Text style={styles.manque}>
            Pas de jeton Mapbox. Ajoute EXPO_PUBLIC_MAPBOX_TOKEN, un jeton
            public pk.…, dans ton .env, puis recharge avec r.
          </Text>
        )}
      </View>

      <Text style={styles.legende}>
        {draft
          ? `Endroit choisi : ${draft.lat}, ${draft.lon}, au quartier près.`
          : "Touche la carte pour choisir l’endroit de ta plante. La position de ton téléphone n’est jamais utilisée."}
      </Text>

      <View style={styles.ligne}>
        <TextInput
          value={latText}
          onChangeText={setLatText}
          placeholder="latitude"
          keyboardType="numbers-and-punctuation"
          style={styles.champ}
          accessibilityLabel="Latitude"
        />
        <TextInput
          value={lonText}
          onChangeText={setLonText}
          placeholder="longitude"
          keyboardType="numbers-and-punctuation"
          style={styles.champ}
          accessibilityLabel="Longitude"
        />
        <Pressable
          onPress={chooseTyped}
          style={styles.boutonSecondaire}
          accessibilityRole="button"
        >
          <Text style={styles.texte}>Choisir</Text>
        </Pressable>
      </View>

      <View style={styles.ligne}>
        <Switch
          value={consent}
          onValueChange={setConsent}
          accessibilityLabel="Consentement"
        />
        <Text style={styles.texte}>
          J’accepte que l’endroit approximatif de ma plante soit visible par la
          classe.
        </Text>
      </View>
      <View style={styles.ligne}>
        <Switch
          value={onlyFollowed}
          onValueChange={setOnlyFollowed}
          accessibilityLabel="Mes plantes seulement"
        />
        <Text style={styles.texte}>
          Seulement ma plante et celles de ma liste.
        </Text>
      </View>

      <View style={styles.ligne}>
        <Pressable
          onPress={placer}
          disabled={!draft || !consent}
          style={[styles.bouton, (!draft || !consent) && styles.inactif]}
          accessibilityRole="button"
        >
          <Text style={styles.texteBouton}>Placer ma plante ici</Text>
        </Pressable>
        <Pressable
          onPress={retirer}
          style={styles.boutonSecondaire}
          accessibilityRole="button"
        >
          <Text style={styles.texte}>Retirer ma plante</Text>
        </Pressable>
      </View>
      {message && <Text style={styles.legende}>{message}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COULEURS.fond, padding: ESPACES.moyen },
  titre: { fontSize: 26, fontWeight: "700", color: COULEURS.texte },
  filet: {
    height: 3,
    width: 48,
    backgroundColor: COULEURS.accent,
    marginVertical: ESPACES.petit,
  },
  carteMap: {
    flex: 1,
    borderRadius: RAYONS.carte,
    overflow: "hidden",
    marginVertical: ESPACES.petit,
    backgroundColor: COULEURS.carte,
  },
  map: { flex: 1 },
  manque: { color: COULEURS.texte, padding: ESPACES.moyen },
  legende: { color: COULEURS.gris, marginVertical: 4 },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: ESPACES.petit,
    marginVertical: 4,
  },
  texte: { color: COULEURS.texte, flexShrink: 1 },
  champ: {
    flex: 1,
    borderWidth: 1,
    borderColor: COULEURS.filet,
    borderRadius: RAYONS.carte,
    padding: ESPACES.petit,
    color: COULEURS.texte,
  },
  bouton: {
    backgroundColor: COULEURS.texte,
    borderRadius: RAYONS.carte,
    padding: ESPACES.petit,
  },
  inactif: { opacity: 0.4 },
  texteBouton: { color: COULEURS.carte, fontWeight: "700" },
  boutonSecondaire: { padding: ESPACES.petit },
});
