import { Component } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button } from './Button';
import { Screen } from './Screen';
import { colors, font, space } from '@/theme';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  private reset = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Screen centered>
        <Text style={styles.title}>Something went wrong</Text>
        <Button title="Try again" onPress={this.reset} style={styles.button} />
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    ...font.titleMobile,
    textAlign: 'center',
  },
  button: { marginTop: space.lg, alignSelf: 'stretch' },
});
