import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Horizontal iOS-style slide on both platforms (Android's 'default' is Material).
        // iOS also gets the native swipe-from-left-edge back; Android uses the system back gesture.
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
