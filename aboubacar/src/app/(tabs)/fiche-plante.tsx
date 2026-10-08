import { StyleSheet, Text, View } from "react-native";

import { Fond } from "../../components/Fond";
import { Verre } from "../../components/Verre";
import { COULEURS, ESPACES } from "../../lib/theme";

export default function FichePlanteScreen() {
  return (
    <View style={styles.container}>
      <Fond />
      <Verre style={styles.carte}>
        <Text style={styles.texte}>Fiche plante</Text>
      </Verre>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COULEURS.fond,
  },
  carte: { paddingVertical: ESPACES.moyen, paddingHorizontal: ESPACES.grand },
  texte: { fontSize: 18, fontWeight: "600", color: COULEURS.texte },
});
