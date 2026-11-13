import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import type { SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Redirect, useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, boxApi, hasFlow, isScanCode, SCAN_CODES } from '@/api';
import type { ScanMode } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { Screen } from '@/components/Screen';
import { DEV_NO_AUTH } from '@/config';
import { DEV_SCAN_CODE, nextRole } from '@/dev';
import { boxShadow, colors, font, motion, radius, size, space } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A decoded QR older than this no longer counts as "in view". */
const SCAN_FRESH_MS = 1000;

export default function Scanner() {
  const router = useRouter();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { state, signIn } = useAuth();
  const session = state.status === 'signedIn' ? state.session : null;
  // The switches decide what this screen offers; the role's name is only a label.
  const role = session?.role ?? null;
  const canScan = !!role?.canScan;
  const canFindCopy = !!role?.canFindCopy;
  const hasActions = canScan || canFindCopy;

  // ---- Camera permission -------------------------------------------------
  // null = still being read; the scanner (and its frame) only renders once granted,
  // so an ungranted camera never looks live.
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const autoAsked = useRef(false);

  useEffect(() => {
    // Ask once on mount. No scanning action on this role: don't ask for the camera at all.
    if (hasActions && permission && !permission.granted && permission.canAskAgain && !autoAsked.current) {
      autoAsked.current = true;
      void requestPermission();
    }
  }, [hasActions, permission, requestPermission]);

  // Re-check when returning from Settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void getPermission();
    });
    return () => sub.remove();
  }, [getPermission]);

  // ---- Camera lifecycle --------------------------------------------------
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>();

  // ---- Scan flow ---------------------------------------------------------
  const [torch, setTorch] = useState(false);
  const busy = useRef(false);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const success = useSharedValue(0);

  // Capture-on-button: the camera decodes continuously and only *holds* the
  // latest value; Scan / Find Copy commit it. A value counts as "in view" only
  // if it was decoded within SCAN_FRESH_MS (the camera re-reports a code every
  // frame or so while it stays framed).
  const latest = useRef<{ code: string; at: number } | null>(null);
  const [hint, setHint] = useState<string>();
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Code in view" cue: 1 while a fresh code is held (corners brighten, idle
  // dot hides), 0 otherwise. Mirrors the SCAN_FRESH_MS rule commit() uses, so
  // a lit frame means a tap will capture.
  const reduceMotion = useReducedMotion();
  const inView = useSharedValue(0);
  const cueOn = useRef(false);
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCue = useCallback(
    (on: boolean) => {
      if (cueOn.current === on) return; // decode callbacks arrive every frame; animate only on change
      cueOn.current = on;
      inView.value = reduceMotion ? (on ? 1 : 0) : withSpring(on ? 1 : 0, motion.cueSpring);
    },
    [inView, reduceMotion],
  );

  const clearCue = useCallback(() => {
    if (staleTimer.current) clearTimeout(staleTimer.current);
    cueOn.current = false;
    inView.value = 0;
  }, [inView]);

  // Coming back from the result screen re-arms the scanner.
  useFocusEffect(
    useCallback(() => {
      busy.current = false;
      latest.current = null;
      success.value = 0;
      clearCue();
      return () => {
        if (navTimer.current) clearTimeout(navTimer.current);
        if (hintTimer.current) clearTimeout(hintTimer.current);
        clearCue();
        setHint(undefined);
        setTorch(false);
      };
    }, [success, clearCue]),
  );

  const onBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      latest.current = { code: data, at: Date.now() };
      setCue(true);
      // No new decode within the freshness window = the code left the frame.
      if (staleTimer.current) clearTimeout(staleTimer.current);
      staleTimer.current = setTimeout(() => setCue(false), SCAN_FRESH_MS);
    },
    [setCue],
  );

  /** Server messages run longer than the local hints, so they get more time on screen. */
  function showHint(text: string, ms: number = motion.hintMs) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(undefined), ms);
  }

  /** Commits the framed QR. 'scan' = batch (Result with Save), 'find' = loose copy (view-only). */
  async function commit(mode: ScanMode) {
    if (busy.current) return;

    let code: string;
    if (DEV_NO_AUTH) {
      // DEV: no printed QR needed; both buttons run the stub.
      code = DEV_SCAN_CODE;
    } else {
      const held = latest.current;
      if (!held || Date.now() - held.at > SCAN_FRESH_MS) {
        showHint('No code in view');
        return;
      }
      code = held.code;
    }

    busy.current = true;
    setHint(undefined);
    try {
      const box = await boxApi.lookup(code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      success.value = withSpring(1, motion.successSpring);
      navTimer.current = setTimeout(() => {
        router.push({ pathname: '/result', params: { data: JSON.stringify(box), mode } });
      }, motion.successHoldMs);
    } catch (e) {
      busy.current = false;
      if (e instanceof ApiError && e.code === SCAN_CODES.noSession && session) {
        // The session was taken away or deactivated: same as having none (no-flow screen).
        void signIn({ ...session, session: null });
      } else if (e instanceof ApiError && isScanCode(e.code)) {
        // e.g. wrong_session: the server's message says what's wrong.
        showHint(e.message, motion.hintLongMs);
      } else if (e instanceof ApiError && e.status === 404) {
        showHint('No box found for that code');
      } else if (e instanceof ApiError && e.status === 403) {
        showHint(e.message, motion.hintLongMs);
      } else {
        showHint("Couldn't look up that code");
      }
    }
  }

  function cycleRole() {
    if (!DEV_NO_AUTH || !session) return;
    void Haptics.selectionAsync();
    void signIn({ ...session, role: nextRole(role) });
  }

  // Scanner is pushed from Profile; fall back to it if there's no history (e.g. a deep link).
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  /** Full-screen states (no actions, no permission) keep the same way out, in the same spot. */
  const withBack = (content: ReactNode) => (
    <View style={styles.fill}>
      {content}
      <View style={[styles.floatingBack, { top: insets.top + space.sm }]}>
        <BackChevron onPress={leave} />
      </View>
    </View>
  );

  // Role or work session removed server-side while away: nothing to scan with.
  if (!role || !hasFlow(session)) return <Redirect href="/no-flow" />;

  if (!hasActions) {
    return withBack(
      <Screen centered narrow style={styles.deniedColumn}>
        <Enter index={0}>
          <Ionicons name="scan-outline" size={size.pendingIcon} color={colors.textMuted} />
        </Enter>
        <Enter index={1}>
          <Text style={styles.deniedText}>Scanning isn't enabled for your role.</Text>
        </Enter>
      </Screen>,
    );
  }

  // Permission still being read (a frame or two): plain page, not a fake live frame.
  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    // Permanently denied: only Settings can grant it now.
    const blocked = !permission.canAskAgain;
    return withBack(
      <Screen centered narrow style={styles.deniedColumn}>
        <Enter index={0}>
          <Ionicons name="camera-outline" size={size.pendingIcon} color={colors.textMuted} />
        </Enter>
        <Enter index={1}>
          <Text style={styles.deniedText}>
            {blocked
              ? 'Camera access is off for Trace. Turn it on in Settings to scan codes.'
              : 'Trace needs your camera to scan codes.'}
          </Text>
        </Enter>
        <Enter index={2} style={styles.deniedAction}>
          {blocked ? (
            <Button title="Open Settings" onPress={() => void Linking.openSettings()} />
          ) : (
            <Button title="Allow Camera" onPress={() => void requestPermission()} />
          )}
        </Enter>
      </Screen>,
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Enter index={0} style={styles.pillRow}>
        {/* Pinned left; the pill stays centred on the screen. */}
        <View style={styles.pillBack}>
          <BackChevron onPress={leave} />
        </View>
        <RolePill name={role.name} onPress={DEV_NO_AUTH ? cycleRole : undefined} />
      </Enter>

      <View style={styles.center}>
        <Enter index={1} style={styles.column}>
          <View style={styles.viewfinder}>
            {/*
              First child = bottom of the stack; the frame, check and torch draw over it.
              No opacity on the camera: Android's preview is a SurfaceView, and any
              alpha < 1 composites its window hole over the parent (a white frame).
            */}
            <CameraView
              style={styles.camera}
              facing="back"
              active={focused}
              enableTorch={torch && focused}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={focused ? onBarcodeScanned : undefined}
              onCameraReady={() => {
                setCameraReady(true);
                setCameraError(undefined);
              }}
              onMountError={(e) => setCameraError(e.message || "Camera couldn't start")}
            />
            <ScanFrame success={success} inView={inView} />
            <SuccessOverlay success={success} />
            <PressScale
              scaleTo={motion.torchPressedScale}
              onPress={() => setTorch((t) => !t)}
              style={styles.torch}
              accessibilityLabel={torch ? 'Turn flashlight off' : 'Turn flashlight on'}
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-outline'}
                size={size.torchIcon}
                color={colors.onPrimary}
              />
            </PressScale>
          </View>
        </Enter>

        <Enter index={2} style={[styles.column, styles.scanAction]}>
          {canScan ? (
            <Button
              variant="action"
              icon="scan-outline"
              title="Scan"
              pressedScale={motion.scanPressedScale}
              onPress={() => void commit('scan')}
            />
          ) : null}
          <Text
            style={[styles.helper, !canScan && styles.helperFirst, hint || cameraError ? styles.hint : null]}
            accessibilityLiveRegion="polite"
          >
            {hint ?? cameraError ?? (cameraReady ? 'Align code inside corner frame' : 'Starting camera…')}
          </Text>
          {canFindCopy ? (
            // Primary weight when it's the only action on the screen.
            <Button
              variant={canScan ? 'tonal' : 'action'}
              icon="search-outline"
              title="Find Copy"
              pressedScale={motion.scanPressedScale}
              onPress={() => void commit('find')}
              style={styles.findCopy}
            />
          ) : null}
        </Enter>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

function RolePill({ name, onPress }: { name: string; onPress?: () => void }) {
  const content = (
    <>
      <View style={styles.pillDot} />
      <Text style={styles.pillText}>{`Role: ${name}`}</Text>
    </>
  );
  if (!onPress) return <View style={styles.pill}>{content}</View>;
  return (
    <PressScale
      scaleTo={motion.pillPressedScale}
      onPress={onPress}
      style={styles.pill}
      accessibilityLabel={`Role: ${name}. Tap to switch role.`}
    >
      {content}
    </PressScale>
  );
}

function ScanFrame({ success, inView }: { success: SharedValue<number>; inView: SharedValue<number> }) {
  const reduceMotion = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    sweep.value = withRepeat(
      withTiming(1, { duration: motion.scanLineMs, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(sweep);
  }, [reduceMotion, sweep]);

  // Corners rest dimmed and light to full primary while a code is in view.
  const corners = useAnimatedStyle(() => ({
    opacity: interpolate(inView.value, [0, 1], [motion.cornerRestOpacity, 1]),
  }));
  // Idle visuals step aside while the success check shows; the dot also hides while a code is in view.
  const idle = useAnimatedStyle(() => ({ opacity: (1 - success.value) * (1 - inView.value) }));
  const line = useAnimatedStyle(() => ({
    opacity: 1 - success.value,
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [0, size.scanFrame - size.scanLine]) }],
  }));

  return (
    <View style={styles.frame} pointerEvents="none">
      <Animated.View style={[styles.corner, styles.cornerTL, corners]} />
      <Animated.View style={[styles.corner, styles.cornerTR, corners]} />
      <Animated.View style={[styles.corner, styles.cornerBL, corners]} />
      <Animated.View style={[styles.corner, styles.cornerBR, corners]} />
      {reduceMotion ? null : <Animated.View style={[styles.scanLine, line]} />}
      <Animated.View style={[styles.idleDot, idle]} />
    </View>
  );
}

function SuccessOverlay({ success }: { success: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(success.value * 1.5, 1),
    transform: [{ scale: interpolate(success.value, [0, 1], [motion.successHiddenScale, 1]) }],
  }));

  return (
    <Animated.View style={[styles.successWrap, style]} pointerEvents="none">
      <View style={styles.successCircle}>
        <Ionicons name="checkmark" size={size.successIcon} color={colors.onPrimary} />
      </View>
      <Text style={styles.successLabel}>Scanned</Text>
    </Animated.View>
  );
}

/** Minimal back affordance: a primary chevron, same press scale as the role pill. */
function BackChevron({ onPress }: { onPress: () => void }) {
  return (
    <PressScale
      scaleTo={motion.pillPressedScale}
      onPress={onPress}
      style={styles.back}
      accessibilityLabel="Back to Profile"
    >
      <Ionicons name="chevron-back" size={size.headerIcon} color={colors.primary} />
    </PressScale>
  );
}

function PressScale({
  scaleTo,
  onPress,
  style,
  accessibilityLabel,
  children,
}: {
  scaleTo: number;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={space.xs}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, motion.pressSpring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.pressSpring);
      }}
      onPress={onPress}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------

const cornerRadius = radius.frameCorner;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: space.screenMargin },

  pillRow: { alignItems: 'center', justifyContent: 'center', marginTop: space.sm },
  pillBack: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  fill: { flex: 1, backgroundColor: colors.background },
  floatingBack: { position: 'absolute', left: space.screenMargin },
  back: { padding: space.xs, marginLeft: -space.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: size.pillPaddingY,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    boxShadow: boxShadow.pill,
  },
  pillDot: {
    width: size.roleDot,
    height: size.roleDot,
    borderRadius: size.roleDot / 2,
    backgroundColor: colors.primary,
  },
  pillText: { ...font.pill, color: colors.text },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  column: { width: '100%', maxWidth: size.viewfinderMax },

  viewfinder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.viewfinder,
    // Dark behind the feed, so the moment before the preview starts reads as a camera, not a blank card.
    backgroundColor: colors.cameraBackdrop,
    boxShadow: boxShadow.viewfinder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: StyleSheet.absoluteFill,

  frame: { width: size.scanFrame, height: size.scanFrame },
  corner: {
    position: 'absolute',
    width: size.frameCorner,
    height: size.frameCorner,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: size.frameStroke,
    borderLeftWidth: size.frameStroke,
    borderTopLeftRadius: cornerRadius,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: size.frameStroke,
    borderRightWidth: size.frameStroke,
    borderTopRightRadius: cornerRadius,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: size.frameStroke,
    borderLeftWidth: size.frameStroke,
    borderBottomLeftRadius: cornerRadius,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: size.frameStroke,
    borderRightWidth: size.frameStroke,
    borderBottomRightRadius: cornerRadius,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: space.sm,
    right: space.sm,
    height: size.scanLine,
    borderRadius: size.scanLine,
    backgroundColor: colors.primary,
    boxShadow: boxShadow.scanLineGlow,
  },
  idleDot: {
    position: 'absolute',
    top: (size.scanFrame - size.idleDot) / 2,
    left: (size.scanFrame - size.idleDot) / 2,
    width: size.idleDot,
    height: size.idleDot,
    borderRadius: size.idleDot / 2,
    backgroundColor: colors.primaryFaint,
  },

  successWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  successCircle: {
    width: size.successCircle,
    height: size.successCircle,
    borderRadius: size.successCircle / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successLabel: { ...font.successLabel, color: colors.primary },

  torch: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    width: size.torch,
    height: size.torch,
    borderRadius: size.torch / 2,
    backgroundColor: colors.scrimDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanAction: { marginTop: space.lg },
  findCopy: { marginTop: space.md },
  hint: { color: colors.danger },
  /** Find Copy alone: the helper leads the action column. */
  helperFirst: { marginTop: 0 },
  helper: {
    ...font.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
  },

  deniedColumn: { alignItems: 'center' },
  deniedText: {
    ...font.input,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.lg,
  },
  deniedAction: { marginTop: space.xl, alignSelf: 'stretch' },
});
