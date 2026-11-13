import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { hasFlow } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function Index() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (state.status === 'signedOut') return <Redirect href="/login" />;
  // Approved without a role or a work session: nothing to do until management assigns both.
  if (!hasFlow(state.session)) return <Redirect href="/no-flow" />;
  return <Redirect href="/profile" />;
}
