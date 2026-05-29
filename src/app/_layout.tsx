import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="feeling" />
      <Stack.Screen name="note" />
      <Stack.Screen name="media" />
      <Stack.Screen name="layer-added" />
      <Stack.Screen name="entry/[id]" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
