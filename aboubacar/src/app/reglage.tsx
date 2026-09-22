import { StyleSheet, Text, View } from "react-native";

export default function ReglageScreen() {
  return (
    <View style={styles.container}>
      <Text>Réglages</Text>
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
