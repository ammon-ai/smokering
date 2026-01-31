import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, Button, SegmentedButtons } from 'react-native-paper';
import { spacing, theme, touchTargets } from '../utils/theme';

interface TempLoggerProps {
  currentTemp?: number;
  onLogTemp: (data: {
    internalTempF: number;
    smokerTempF?: number;
    probeLocation?: string;
  }) => void;
  targetTemp: number;
  isLoading?: boolean;
}

export function TempLogger({
  currentTemp,
  onLogTemp,
  targetTemp,
  isLoading,
}: TempLoggerProps) {
  const [internalTemp, setInternalTemp] = useState(currentTemp || 100);
  const [smokerTemp, setSmokerTemp] = useState<number | undefined>(undefined);
  const [probeLocation, setProbeLocation] = useState<string>('THICKEST');
  const [showSmokerTemp, setShowSmokerTemp] = useState(false);

  const adjustTemp = (amount: number) => {
    setInternalTemp((prev) => Math.max(32, Math.min(220, prev + amount)));
  };

  const handleSubmit = () => {
    onLogTemp({
      internalTempF: internalTemp,
      smokerTempF: showSmokerTemp ? smokerTemp : undefined,
      probeLocation,
    });
  };

  const progress = Math.min(100, (internalTemp / targetTemp) * 100);
  const progressColor =
    progress >= 95
      ? theme.colors.success
      : progress >= 75
      ? theme.colors.warning
      : theme.colors.primary;

  return (
    <Surface style={styles.container} elevation={2}>
      <Text style={styles.title}>Log Temperature</Text>

      {/* Main temp display and controls */}
      <View style={styles.tempSection}>
        <View style={styles.tempDisplay}>
          <Text style={[styles.tempValue, { color: progressColor }]}>
            {internalTemp}°F
          </Text>
          <Text style={styles.targetText}>Target: {targetTemp}°F</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
        </View>

        {/* Quick adjust buttons */}
        <View style={styles.adjustButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.adjustButton,
              styles.adjustButtonLarge,
              pressed && styles.adjustButtonPressed,
            ]}
            onPress={() => adjustTemp(-10)}
          >
            <Text style={styles.adjustButtonText}>-10</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.adjustButton,
              pressed && styles.adjustButtonPressed,
            ]}
            onPress={() => adjustTemp(-5)}
          >
            <Text style={styles.adjustButtonText}>-5</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.adjustButton,
              pressed && styles.adjustButtonPressed,
            ]}
            onPress={() => adjustTemp(-1)}
          >
            <Text style={styles.adjustButtonText}>-1</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.adjustButton,
              pressed && styles.adjustButtonPressed,
            ]}
            onPress={() => adjustTemp(1)}
          >
            <Text style={styles.adjustButtonText}>+1</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.adjustButton,
              pressed && styles.adjustButtonPressed,
            ]}
            onPress={() => adjustTemp(5)}
          >
            <Text style={styles.adjustButtonText}>+5</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.adjustButton,
              styles.adjustButtonLarge,
              pressed && styles.adjustButtonPressed,
            ]}
            onPress={() => adjustTemp(10)}
          >
            <Text style={styles.adjustButtonText}>+10</Text>
          </Pressable>
        </View>
      </View>

      {/* Probe location */}
      <View style={styles.probeSection}>
        <Text style={styles.sectionLabel}>Probe Location</Text>
        <SegmentedButtons
          value={probeLocation}
          onValueChange={setProbeLocation}
          buttons={[
            { value: 'POINT', label: 'Point' },
            { value: 'FLAT', label: 'Flat' },
            { value: 'THICKEST', label: 'Thickest' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Optional smoker temp */}
      <Pressable
        style={styles.optionalSection}
        onPress={() => setShowSmokerTemp(!showSmokerTemp)}
      >
        <Text style={styles.optionalLabel}>
          {showSmokerTemp ? '▼' : '▶'} Smoker Temperature (optional)
        </Text>
      </Pressable>

      {showSmokerTemp && (
        <View style={styles.smokerTempSection}>
          <View style={styles.smokerTempRow}>
            <Pressable
              style={({ pressed }) => [
                styles.adjustButton,
                pressed && styles.adjustButtonPressed,
              ]}
              onPress={() => setSmokerTemp((prev) => Math.max(100, (prev || 225) - 5))}
            >
              <Text style={styles.adjustButtonText}>-5</Text>
            </Pressable>
            <Text style={styles.smokerTempValue}>{smokerTemp || 225}°F</Text>
            <Pressable
              style={({ pressed }) => [
                styles.adjustButton,
                pressed && styles.adjustButtonPressed,
              ]}
              onPress={() => setSmokerTemp((prev) => Math.min(500, (prev || 225) + 5))}
            >
              <Text style={styles.adjustButtonText}>+5</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Submit button */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={isLoading}
        disabled={isLoading}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        Log Temperature
      </Button>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  tempSection: {
    marginBottom: spacing.lg,
  },
  tempDisplay: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tempValue: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  targetText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  adjustButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  adjustButton: {
    width: touchTargets.comfortable,
    height: touchTargets.comfortable,
    borderRadius: touchTargets.comfortable / 2,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonLarge: {
    backgroundColor: theme.colors.primaryContainer,
  },
  adjustButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  adjustButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  probeSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  optionalSection: {
    paddingVertical: spacing.sm,
  },
  optionalLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  smokerTempSection: {
    marginBottom: spacing.md,
  },
  smokerTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  smokerTempValue: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.onSurface,
    minWidth: 80,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  submitButtonContent: {
    height: touchTargets.large,
  },
});
