// Design tokens from the Stitch export. Screens must use these, never raw values.

export const colors = {
  background: '#FAF9FE',
  card: '#FFFFFF',
  logoTile: '#EEEDF3',
  text: '#1A1B1F',
  textMuted: '#414754',
  placeholder: '#717786',
  primary: '#005AB3',
  onPrimary: '#FFFFFF',
  border: 'rgba(0, 0, 0, 0.04)',
  surfaceContainer: '#EEEDF3',
  surfaceContainerHigh: '#E8E7ED',
  outline: '#717786',
  /** primary at 40%: viewfinder idle dot. */
  primaryFaint: 'rgba(0, 90, 179, 0.4)',
  /** Fixed header: translucent surface (no native blur installed yet). */
  headerScrim: 'rgba(250, 249, 254, 0.88)',
  /** Torch toggle over the camera feed. */
  scrimDark: 'rgba(0, 0, 0, 0.35)',
  /** Viewfinder fill behind the live camera feed (shows until the preview starts). */
  cameraBackdrop: '#111215',
  // Not part of the Stitch export; the "Received" pill needs a success colour.
  success: '#1B7F3B',
  successTint: 'rgba(27, 127, 59, 0.12)',
  // Not part of the Stitch export; validation errors need a signal colour.
  danger: '#BA1A1A',
  shadow: '#000000',
  /** Opaque primary ~10% tint (Stitch #E8F1FB): avatar circle + role badge. */
  tint: '#E8F1FB',
} as const;

/**
 * Palettes. The app is pinned to light (app.json userInterfaceStyle), so only
 * lightPalette is used (Profile). darkPalette is unused, kept for a future dark mode;
 * the other screens use the static light `colors`.
 */
export type Palette = {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  divider: string;
  tint: string;
  /** boxShadow for cards; undefined (no shadow) in dark. */
  cardShadow: string | undefined;
};

export const lightPalette: Palette = {
  background: colors.background,
  card: colors.card,
  text: colors.text,
  textMuted: colors.textMuted,
  divider: colors.surfaceContainer,
  tint: colors.tint,
  cardShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
};

export const darkPalette: Palette = {
  // Not in the Stitch spec: page background under the #16181F cards.
  background: '#0E0F13',
  card: '#16181F',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  divider: '#2A2D37',
  tint: 'rgba(0, 90, 179, 0.2)',
  cardShadow: undefined,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screenMargin: 16,
} as const;

export const radius = {
  input: 16,
  button: 12,
  logoTile: 16,
  action: 16,
  card: 16,
  viewfinder: 32,
  frameCorner: 10,
  full: 9999,
} as const;

// Inter, loaded in app/_layout.tsx. Android can't combine a custom family with
// fontWeight, so each weight is its own family name (iOS gets the same for parity).
export const fontFamily = {
  regular: 'Inter_400Regular', // 400
  medium: 'Inter_500Medium', // 500
  semibold: 'Inter_600SemiBold', // 600
  bold: 'Inter_700Bold', // 700
} as const;

export const font = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, letterSpacing: -0.68 },
  titleMobile: { fontFamily: fontFamily.bold, fontSize: 24 },
  button: { fontFamily: fontFamily.semibold, fontSize: 20 },
  input: { fontFamily: fontFamily.regular, fontSize: 17 },
  label: { fontFamily: fontFamily.medium, fontSize: 13 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13 },
  link: { fontFamily: fontFamily.regular, fontSize: 15 },
  /** Scanner/result primary actions. */
  action: { fontFamily: fontFamily.semibold, fontSize: 17 },
  headerTitle: { fontFamily: fontFamily.semibold, fontSize: 20 },
  /** "Role: Receiver" pill: medium, tracking-tight (-0.025em). */
  pill: { fontFamily: fontFamily.medium, fontSize: 13, letterSpacing: -0.325 },
  /** "RECEIVER" badge: semibold, tracking-wider (0.05em). */
  badge: { fontFamily: fontFamily.semibold, fontSize: 11, letterSpacing: 0.55 },
  rowLabel: { fontFamily: fontFamily.regular, fontSize: 15 },
  rowValue: { fontFamily: fontFamily.medium, fontSize: 15 },
  emphasis: { fontFamily: fontFamily.semibold, fontSize: 20 },
  successLabel: { fontFamily: fontFamily.semibold, fontSize: 13 },
  /** Profile stat: 40/48 bold, tracking -0.02em. */
  stat: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 48, letterSpacing: -0.8 },
} as const;

export const size = {
  authMaxWidth: 384,
  logoTile: 64,
  logoIcon: 32,
  fieldIcon: 24,
  pendingIcon: 64,
  inputHeightLogin: 56,
  inputHeightRegister: 48,
  buttonHeight: 48,
  buttonPressedScale: 0.99,
  // Scanner
  viewfinderMax: 320,
  scanFrame: 210,
  frameCorner: 24,
  frameStroke: 3,
  scanLine: 2,
  idleDot: 8,
  torch: 36,
  torchIcon: 20,
  successCircle: 56,
  successIcon: 30,
  roleDot: 6,
  pillPaddingY: 6,
  actionIcon: 20,
  // Result
  headerHeight: 56,
  headerIcon: 24,
  avatar: 32,
  avatarIcon: 18,
  progressHeight: 6,
  /** Gap between stacked/side-by-side result actions. */
  actionGap: 12,
  // Profile
  profileAvatar: 72,
  profileAvatarIcon: 32,
  infoRowPaddingY: 14,
  infoDivider: 0.5,
  // Workflow progress (Result)
  stepMarker: 24,
  stepIcon: 14,
  stepRail: 2,
} as const;

export const shadow = {
  field: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Focused-field lift: same shadow, slightly stronger.
  fieldFocused: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;

/** Exact CSS shadows from Stitch, via RN's boxShadow. */
export const boxShadow = {
  viewfinder: '0 4px 24px rgba(0, 0, 0, 0.06)',
  card: '0 2px 12px rgba(0, 0, 0, 0.03)',
  pill: '0 1px 2px rgba(0, 0, 0, 0.05)',
  headerHairline: '0 1px 0 rgba(0, 0, 0, 0.06)',
  scanLineGlow: '0 0 8px rgba(0, 90, 179, 0.6)',
} as const;

// Motion tokens. Restrained by design: fast, critically damped, no overshoot.
export const motion = {
  /** Content entrance: fade + small rise. */
  enterOffset: 10,
  enterDuration: 280,
  stagger: 40,
  /** Later items share this delay so the whole screen lands well under 500ms. */
  maxEnterDelay: 160,
  /** Press spring: damping ratio 1 (damping 40 / 2*sqrt(stiffness 400)), clamped. */
  pressSpring: { damping: 40, stiffness: 400, mass: 1, overshootClamping: true },
  pressedScale: 0.97,
  linkPressedOpacity: 0.5,
  linkPressInMs: 80,
  linkPressOutMs: 140,
  focusMs: 150,
  pillPressedScale: 0.95,
  torchPressedScale: 0.9,
  scanPressedScale: 0.99,
  scanNextPressedScale: 0.98,
  /** The one celebratory spring: the success check pops in with a touch of overshoot. */
  successSpring: { damping: 14, stiffness: 220, mass: 1 },
  successHiddenScale: 0.75,
  /** How long the success check is held before the result screen opens. */
  successHoldMs: 550,
  scanLineMs: 2200,
  pulseMs: 900,
  /** Profile entrance: critically damped spring, response ~0.35s. */
  profileEnterDuration: 350,
  profileStagger: 60,
  /** Reduced-motion replacement for every entrance: a plain cross-fade. */
  reducedFadeMs: 200,
  /** How long the scanner's "No code in view" hint stays up. */
  hintMs: 2000,
  /** Server messages (e.g. "This box belongs to another session...") are longer: more time to read. */
  hintLongMs: 4000,
  /** "Code in view" cue: quick, critically damped, no overshoot. */
  cueSpring: { damping: 40, stiffness: 500, mass: 1, overshootClamping: true },
  /** Corner brackets at rest (no code in view); they light to 1 when one is. */
  cornerRestOpacity: 0.45,
} as const;
