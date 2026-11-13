export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export const SESSION_KEY = 'trace.session';

/**
 * DEV ONLY. When true, auth and scanning skip the backend so every screen is
 * reachable without a server: mock sessions, tappable role pill, Scan button
 * runs the stub lookup directly. Everything it gates lives behind this flag
 * (see src/dev.ts). Set to false to restore the real API behavior.
 */
export const DEV_NO_AUTH = false;
