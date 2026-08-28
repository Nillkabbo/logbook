import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import { useI18n } from '@/ui/i18n';

/**
 * The app's signature control: emerald→teal gradient when idle, solid red while
 * running, springy press-scale, a haptic on every transition, and a slow
 * breathing ring while a Running session exists — the at-a-glance signal.
 */
export function CheckInToggle({
  running,
  disabled,
  onPress,
}: {
  running: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const scale = useRef(new Animated.Value(1)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) {
      breath.stopAnimation();
      breath.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [running, breath]);

  const ringScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ringOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.05] });

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  const press = () => {
    // A denied/unavailable haptic must never block the toggle.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  return (
    <View style={styles.wrap}>
      {running && (
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: theme.stop,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPressIn={pressIn}
          onPressOut={pressOut}
          onPress={press}
          disabled={disabled}>
          {running ? (
            <View style={[styles.circle, { backgroundColor: theme.stop }]}>
              <Text style={[styles.label, { color: theme.onAccent }]}>{t('checkOut')}</Text>
            </View>
          ) : (
            <LinearGradient
              colors={[theme.accent, theme.accentAlt]}
              style={styles.circle}>
              <Text style={[styles.label, { color: theme.onAccent }]}>{t('checkIn')}</Text>
            </LinearGradient>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const SIZE = 220;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 24,
    height: SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 26,
    fontWeight: '700',
  },
});
