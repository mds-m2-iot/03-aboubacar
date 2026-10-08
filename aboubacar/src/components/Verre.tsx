import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { COULEURS, RAYONS } from '../lib/theme';

/** Vrai liquid glass seulement sur iOS 26+, et si l'API existe vraiment (certaines bêtas plantent). */
const VERRE_NATIF = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Teinte légère du verre, par exemple la couleur d'une humeur. */
  teinte?: string;
  /** Le verre réagit au toucher (boutons). */
  interactif?: boolean;
};

/**
 * Une carte en verre. Liquid glass natif sur iOS 26, et partout
 * ailleurs un verre simulé : blanc translucide et liseré clair.
 * Attention : jamais d'opacity à 0 sur ce composant ou un parent,
 * le verre natif ne se dessinerait plus du tout.
 */
export function Verre({ children, style, teinte, interactif = false }: Props) {
  if (VERRE_NATIF) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={teinte}
        isInteractive={interactif}
        style={[styles.base, style]}
      >
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.base, styles.simule, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: RAYONS.carte, overflow: 'hidden' },
  simule: {
    backgroundColor: COULEURS.verre,
    borderWidth: 1,
    borderColor: COULEURS.bordVerre,
  },
});
