import { StyleSheet, Text, View, Button } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue</Text>
      <Button title="Aller au profil" onPress={() => router.push("/profil")} />
      <Button
        title="Aller à la fiche plante"
        onPress={() => router.push("/fiche-plante")}
      />
      <Button
        title="Aller aux réglages"
        onPress={() => router.push("/reglage")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
