import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Accueil" }} />
      <Stack.Screen name="profil" options={{ title: "Profil" }} />
      <Stack.Screen name="fiche-plante" options={{ title: "Fiche plante" }} />
      <Stack.Screen name="reglage" options={{ title: "Réglages" }} />
    </Stack>
  );
}
