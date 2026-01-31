import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { theme, spacing, getConfidenceColor } from '../utils/theme';
import { UserInsights, MEAT_CUT_LABELS } from '@smokering/shared';

const { width } = Dimensions.get('window');

export function InsightsScreen() {
  const [insights, setInsights] = useState<UserInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    const response = await api.getInsights();

    if (response.success && response.data) {
      setInsights(response.data as UserInsights);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!insights) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="analytics-outline"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.emptyText}>No insights yet</Text>
        <Text style={styles.emptySubtext}>
          Complete some cooks to see your statistics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Insights</Text>

      {/* Overview Stats */}
      <View style={styles.statsRow}>
        <Surface style={styles.statCard} elevation={1}>
          <Text style={styles.statValue}>{insights.totalCooks}</Text>
          <Text style={styles.statLabel}>Total Cooks</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text
            style={[
              styles.statValue,
              {
                color: getConfidenceColor(
                  insights.successRate >= 70 ? 80 : insights.successRate >= 50 ? 55 : 30
                ),
              },
            ]}
          >
            {insights.successRate}%
          </Text>
          <Text style={styles.statLabel}>Success Rate</Text>
        </Surface>
        <Surface style={styles.statCard} elevation={1}>
          <Text
            style={[
              styles.statValue,
              {
                color: getConfidenceColor(
                  insights.averagePredictionAccuracy <= 20
                    ? 80
                    : insights.averagePredictionAccuracy <= 45
                    ? 55
                    : 30
                ),
              },
            ]}
          >
            ±{insights.averagePredictionAccuracy}
          </Text>
          <Text style={styles.statLabel}>Avg Accuracy (min)</Text>
        </Surface>
      </View>

      {/* Favorite Cut */}
      <Surface style={styles.infoCard} elevation={1}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="restaurant" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Most Cooked</Text>
            <Text style={styles.infoValue}>
              {MEAT_CUT_LABELS[insights.mostCookedCut as keyof typeof MEAT_CUT_LABELS] ||
                insights.mostCookedCut}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Favorite Equipment */}
      {insights.favoriteEquipment && (
        <Surface style={styles.infoCard} elevation={1}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="flame" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Favorite Smoker</Text>
              <Text style={styles.infoValue}>
                {insights.favoriteEquipment.nickname ||
                  `${insights.favoriteEquipment.brand} ${insights.favoriteEquipment.model}` ||
                  insights.favoriteEquipment.type}
              </Text>
            </View>
          </View>
        </Surface>
      )}

      {/* Cooks by Month Chart */}
      {insights.cooksByMonth.length > 0 && (
        <Surface style={styles.chartCard} elevation={1}>
          <Text style={styles.sectionTitle}>Cooks Over Time</Text>
          <View style={styles.chartContainer}>
            {insights.cooksByMonth.slice(-6).map((month, index) => {
              const maxCount = Math.max(
                ...insights.cooksByMonth.map((m) => m.count),
                1
              );
              const height = (month.count / maxCount) * 100;

              return (
                <View key={index} style={styles.chartBar}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(height, 5)}%`,
                        backgroundColor:
                          month.count > 0
                            ? theme.colors.primary
                            : theme.colors.surfaceVariant,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{month.month}</Text>
                  <Text style={styles.barValue}>{month.count}</Text>
                </View>
              );
            })}
          </View>
        </Surface>
      )}

      {/* Equipment Performance */}
      {insights.equipmentPerformance.length > 0 && (
        <Surface style={styles.listCard} elevation={1}>
          <Text style={styles.sectionTitle}>Equipment Performance</Text>
          {insights.equipmentPerformance.map((eq) => (
            <View key={eq.equipmentId} style={styles.listItem}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>
                  {eq.nickname || 'Unnamed Smoker'}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  {eq.cookCount} cook{eq.cookCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.listItemValue}>
                <Text
                  style={[
                    styles.accuracyValue,
                    {
                      color: getConfidenceColor(
                        eq.avgAccuracy <= 20
                          ? 80
                          : eq.avgAccuracy <= 45
                          ? 55
                          : 30
                      ),
                    },
                  ]}
                >
                  ±{eq.avgAccuracy}min
                </Text>
              </View>
            </View>
          ))}
        </Surface>
      )}

      {/* Tips */}
      <Surface style={styles.tipsCard} elevation={1}>
        <Text style={styles.sectionTitle}>💡 Tips for Improvement</Text>
        {insights.averagePredictionAccuracy > 30 && (
          <Text style={styles.tipText}>
            • Log temperatures more frequently for better predictions
          </Text>
        )}
        {insights.successRate < 70 && (
          <Text style={styles.tipText}>
            • Try wrapping during the stall to improve consistency
          </Text>
        )}
        <Text style={styles.tipText}>
          • Rest your meat for at least 1 hour after cooking
        </Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 2,
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '60%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  listCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  listItemValue: {
    alignItems: 'flex-end',
  },
  accuracyValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipsCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
});
