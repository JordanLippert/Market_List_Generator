import { StyleSheet } from 'react-native';
import { theme } from '@ui/styles/theme';

export const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(245, 241, 232, 0.35)'
  },
  ghostDark: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.ink
  },
  go: {
    backgroundColor: theme.colors.go,
    borderColor: theme.colors.go
  },
  disabled: { opacity: 0.5 },
  labelGhost: { color: 'rgba(245, 241, 232, 0.85)' },
  labelGhostDark: { color: theme.colors.ink },
  labelGo: { color: theme.colors.goInk }
});
