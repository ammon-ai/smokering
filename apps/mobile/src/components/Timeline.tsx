import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { getConfidenceColor, spacing, theme } from '../utils/theme';
import { PhaseDefinition, Confidence } from '@smokering/shared';

interface TimelineProps {
  phases: PhaseDefinition[];
  currentPhase?: string;
  orientation?: 'vertical' | 'horizontal';
}

export function Timeline({
  phases,
  currentPhase,
  orientation = 'vertical',
}: TimelineProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getPhaseStatus = (phase: PhaseDefinition, index: number): 'completed' | 'current' | 'upcoming' => {
    if (currentPhase === phase.name) return 'current';

    const currentIndex = phases.findIndex((p) => p.name === currentPhase);
    if (currentIndex === -1) return 'upcoming';

    return index < currentIndex ? 'completed' : 'upcoming';
  };

  if (orientation === 'horizontal') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.horizontalContainer}>
          {phases.map((phase, index) => (
            <HorizontalPhaseItem
              key={phase.name}
              phase={phase}
              status={getPhaseStatus(phase, index)}
              isLast={index === phases.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.verticalContainer}>
      {phases.map((phase, index) => (
        <VerticalPhaseItem
          key={phase.name}
          phase={phase}
          status={getPhaseStatus(phase, index)}
          isLast={index === phases.length - 1}
        />
      ))}
    </View>
  );
}

interface PhaseItemProps {
  phase: PhaseDefinition;
  status: 'completed' | 'current' | 'upcoming';
  isLast: boolean;
}

function VerticalPhaseItem({ phase, status, isLast }: PhaseItemProps) {
  const confidenceColor = getConfidenceColor(
    phase.confidence === Confidence.HIGH ? 80 : phase.confidence === Confidence.MEDIUM ? 55 : 25
  );

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDuration = () => {
    const { min, max } = phase.durationRange;
    if (min === max || max === 0) return '';
    const minHrs = Math.floor(min / 60);
    const minMins = min % 60;
    const maxHrs = Math.floor(max / 60);
    const maxMins = max % 60;

    if (minHrs === 0 && maxHrs === 0) {
      return `${minMins}-${maxMins}m`;
    }
    return `${minHrs}:${minMins.toString().padStart(2, '0')}-${maxHrs}:${maxMins.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.verticalItem}>
      {/* Timeline dot and line */}
      <View style={styles.timelineTrack}>
        <View
          style={[
            styles.dot,
            status === 'completed' && styles.dotCompleted,
            status === 'current' && styles.dotCurrent,
            status === 'upcoming' && styles.dotUpcoming,
          ]}
        />
        {!isLast && (
          <View
            style={[
              styles.line,
              status === 'completed' && styles.lineCompleted,
            ]}
          />
        )}
      </View>

      {/* Phase content */}
      <Surface
        style={[
          styles.phaseCard,
          status === 'current' && styles.phaseCardCurrent,
        ]}
        elevation={status === 'current' ? 3 : 1}
      >
        <View style={styles.phaseHeader}>
          <Text
            style={[
              styles.phaseName,
              status === 'current' && styles.phaseNameCurrent,
            ]}
          >
            {phase.name}
          </Text>
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: confidenceColor + '30' },
            ]}
          >
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              {phase.confidence}
            </Text>
          </View>
        </View>

        <View style={styles.phaseDetails}>
          <Text style={styles.phaseTime}>
            {formatTime(phase.startTime)}
            {phase.endTime && ` - ${formatTime(phase.endTime)}`}
          </Text>
          {getDuration() && (
            <Text style={styles.phaseDuration}>{getDuration()}</Text>
          )}
        </View>

        {phase.notes && (
          <Text style={styles.phaseNotes}>{phase.notes}</Text>
        )}
      </Surface>
    </View>
  );
}

function HorizontalPhaseItem({ phase, status, isLast }: PhaseItemProps) {
  const confidenceColor = getConfidenceColor(
    phase.confidence === Confidence.HIGH ? 80 : phase.confidence === Confidence.MEDIUM ? 55 : 25
  );

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.horizontalItem}>
      <Surface
        style={[
          styles.horizontalCard,
          status === 'current' && styles.phaseCardCurrent,
        ]}
        elevation={status === 'current' ? 3 : 1}
      >
        <Text
          style={[
            styles.horizontalPhaseName,
            status === 'current' && styles.phaseNameCurrent,
          ]}
          numberOfLines={1}
        >
          {phase.name}
        </Text>
        <Text style={styles.horizontalTime}>{formatTime(phase.startTime)}</Text>
        <View
          style={[
            styles.horizontalConfidence,
            { backgroundColor: confidenceColor },
          ]}
        />
      </Surface>
      {!isLast && <View style={styles.horizontalConnector} />}
    </View>
  );
}

const styles = StyleSheet.create({
  verticalContainer: {
    paddingVertical: spacing.md,
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  verticalItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  horizontalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineTrack: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.outline,
  },
  dotCompleted: {
    backgroundColor: theme.colors.primary,
  },
  dotCurrent: {
    backgroundColor: theme.colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.colors.primaryContainer,
  },
  dotUpcoming: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 2,
    borderColor: theme.colors.outline,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.outline,
    marginTop: 4,
  },
  lineCompleted: {
    backgroundColor: theme.colors.primary,
  },
  phaseCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.sm,
  },
  phaseCardCurrent: {
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    flex: 1,
  },
  phaseNameCurrent: {
    color: theme.colors.primary,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
  },
  phaseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  phaseTime: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  phaseDuration: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  phaseNotes: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  horizontalCard: {
    width: 100,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  horizontalPhaseName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  horizontalTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  horizontalConfidence: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    marginTop: spacing.xs,
  },
  horizontalConnector: {
    width: 16,
    height: 2,
    backgroundColor: theme.colors.outline,
  },
});
