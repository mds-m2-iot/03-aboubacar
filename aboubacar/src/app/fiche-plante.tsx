import { StyleSheet, Text, View } from "react-native";

export default function FichePlanteScreen() {
  return (
    <View style={styles.container}>
      <Text>Fiche plante</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
