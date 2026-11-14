import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Lora_400Regular, Lora_400Regular_Italic, Lora_700Bold } from '@expo-google-fonts/lora';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessaoProvider } from '../contexts/SessaoContext';
import { colors } from '../theme/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Raiz do app: fontes → gestos → área segura → sessão → pilha de telas.
 *
 * Não há abas: tudo parte do caderno da família (`index`). As outras telas
 * sobem por cima dele como folhas soltas.
 */
export default function RootLayout(): React.JSX.Element | null {
  const [fontesProntas, erroFontes] = useFonts({
    Caveat_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_700Bold,
    SpecialElite_400Regular,
  });

  useEffect(() => {
    if (fontesProntas || erroFontes) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontesProntas, erroFontes]);

  if (!fontesProntas && !erroFontes) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.mesa }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SessaoProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.mesa },
              animation: 'fade',
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="perguntar" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="familia" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="resposta/[envioId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </SessaoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
