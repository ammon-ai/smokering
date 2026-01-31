import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { getConfidenceColor, spacing } from '../utils/theme';
import { Confidence } from '@smokering/shared';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-100
  finishTime?: Date;
  rangeMinutes?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function ConfidenceIndicator({
  confidence,
  finishTime,
  rangeMinutes = 30,
  size = 'medium',
  showLabel = true,
}: ConfidenceIndicatorProps) {
  const color = getConfidenceColor(confidence);

  const sizeStyles = {
    small: { width: 60, height: 60, fontSize: 18 },
    medium: { width: 100, height: 100, fontSize: 28 },
    large: { width: 140, height: 140, fontSize: 36 },
  };

  const { width, height, fontSize } = sizeStyles[size];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getConfidenceLabel = (value: number): string => {
    if (value >= 70) return 'HIGH';
    if (value >= 40) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <View style={styles.container}>
      <Surface style={[styles.circle, { width, height, borderColor: color }]} elevation={2}>
        <Text style={[styles.percentage, { fontSize, color }]}>
          {Math.round(confidence)}%
        </Text>
        {showLabel && (
          <Text style={[styles.label, { color }]}>
            {getConfidenceLabel(confidence)}
          </Text>
        )}
      </Surface>

      {finishTime && (
        <View style={styles.timeContainer}>
          <Text style={styles.finishLabel}>Finish Time</Text>
          <Text style={[styles.finishTime, { color }]}>
            {formatTime(finishTime)}
          </Text>
          <Text style={styles.range}>±{rangeMinutes} min</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  circle: {
    borderRadius: 100,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  percentage: {
    fontWeight: 'bold',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  timeContainer: {
    alignItems: 'center',
  },
  finishLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  finishTime: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  range: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
