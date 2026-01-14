/**
 * SplashScreen
 *
 * Initial splash screen displayed when app launches.
 * Shows the app logo with animation followed by animated text.
 *
 * @module app/navigation/screens/SplashScreen
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Images } from '@/assets';
import { tokens } from '@/shared/theme/tokens';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

/**
 * SplashScreen component
 *
 * Displays animated logo splash screen followed by app name
 */
const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  const [isReady, setIsReady] = useState(false);
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const walkingFadeAnim = useRef(new Animated.Value(0)).current;
  const walkingSlideAnim = useRef(new Animated.Value(20)).current;
  const safelyFadeAnim = useRef(new Animated.Value(0)).current;
  const safelySlideAnim = useRef(new Animated.Value(20)).current;
  const allFadeOutAnim = useRef(new Animated.Value(1)).current;
  const hasFinishedRef = useRef(false);

  // Delay start to ensure component is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || hasFinishedRef.current) return;

    // Sequence of animations
    Animated.sequence([
      // 1. Logo appears
      Animated.parallel([
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Small delay
      Animated.delay(400),
      // 3. "Walking" appears
      Animated.parallel([
        Animated.timing(walkingFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(walkingSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 4. Small delay
      Animated.delay(200),
      // 5. "Safely" appears
      Animated.parallel([
        Animated.timing(safelyFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(safelySlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 6. Hold for a moment
      Animated.delay(900),
      // 7. Zoom in logo slightly before closing
      Animated.timing(logoScaleAnim, {
        toValue: 1.15,
        duration: 450,
        useNativeDriver: true,
      }),
      // 8. Small pause
      Animated.delay(300),
      // 9. Fade out everything
      Animated.timing(allFadeOutAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        onFinish();
      }
    });
  }, [
    isReady,
    logoFadeAnim,
    logoScaleAnim,
    walkingFadeAnim,
    walkingSlideAnim,
    safelyFadeAnim,
    safelySlideAnim,
    allFadeOutAnim,
    onFinish,
  ]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: allFadeOutAnim },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoFadeAnim,
              transform: [{ scale: logoScaleAnim }],
            },
          ]}
        >
          <Image
            source={Images.logo}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.walkingText,
              {
                opacity: walkingFadeAnim,
                transform: [{ translateY: walkingSlideAnim }],
              },
            ]}
          >
            Walking
          </Animated.Text>
          <Animated.Text
            style={[
              styles.safelyText,
              {
                opacity: safelyFadeAnim,
                transform: [{ translateY: safelySlideAnim }],
              },
            ]}
          >
            Safely
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
  },
  textContainer: {
    alignItems: 'center',
  },
  walkingText: {
    fontSize: 36,
    fontWeight: '700',
    color: tokens.colors.primary[500],
    letterSpacing: 1,
  },
  safelyText: {
    fontSize: 36,
    fontWeight: '700',
    color: tokens.colors.primary[700],
    letterSpacing: 1,
    marginTop: -4,
  },
});

export default SplashScreen;
