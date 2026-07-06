import React, { forwardRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps
} from '@gorhom/bottom-sheet';
import { theme } from '@ui/styles/theme';

interface SheetProps {
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
}

export const Sheet = forwardRef<BottomSheet, SheetProps>(function Sheet({ snapPoints, children, onClose }, ref) {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.55} />
    ),
    []
  );

  const dynamic = !snapPoints || snapPoints.length === 0;

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={dynamic ? undefined : snapPoints}
      enableDynamicSizing={dynamic}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onClose={onClose}
    >
      <BottomSheetView style={styles.body}>
        <View style={{ flex: 1 }}>{children}</View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  background: { backgroundColor: theme.colors.paper, borderRadius: 0 },
  handle: { backgroundColor: theme.colors.ink, width: 44, height: 4 },
  body: { flex: 1, paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3] }
});
