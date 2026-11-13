import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function MainLayout() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (state.status === 'signedOut') return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
