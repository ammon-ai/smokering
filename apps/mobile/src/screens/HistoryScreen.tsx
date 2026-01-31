import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Searchbar, Surface } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, formatDistanceToNow } from 'date-fns';
import { useCookStore } from '../stores/cookStore';
import type { Cook } from '@smokering/shared';

type RootStackParamList = {
  ActiveCook: { cookId: string };
};

const statusFilters = ['ALL', 'COMPLETED', 'ACTIVE', 'CANCELLED'];

export default function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cookHistory, fetchCookHistory, isLoading } = useCookStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useFocusEffect(
    useCallback(() => {
      fetchCookHistory();
    }, [fetchCookHistory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCookHistory();
    setRefreshing(false);
  }, [fetchCookHistory]);

  const handleCookPress = (cook: Cook) => {
    navigation.navigate('ActiveCook', { cookId: cook.id });
  };

  const filteredCooks = cookHistory.filter((cook) => {
    const matchesSearch =
      formatMeatCut(cook.meatCut).toLowerCase().includes(searchQuery.toLowerCase()) ||
      cook.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || cook.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderCookItem = ({ item }: { item: Cook }) => (
    <Card style={styles.cookCard} onPress={() => handleCookPress(item)}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="titleMedium" style={styles.meatTitle}>
              {formatMeatCut(item.meatCut)}
            </Text>
            <Text variant="bodySmall" style={styles.dateText}>
              {item.actualStartTime
                ? format(new Date(item.actualStartTime), 'MMM d, yyyy')
                : format(new Date(item.createdAt), 'MMM d, yyyy')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Chip
              mode="flat"
              style={[styles.statusChip, getStatusStyle(item.status)]}
              textStyle={styles.statusChipText}
            >
              {item.status}
            </Chip>
            {item.outcome && (
              <Chip
                mode="flat"
                style={[styles.outcomeChip, getOutcomeStyle(item.outcome)]}
                textStyle={styles.outcomeChipText}
              >
                {item.outcome}
              </Chip>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text variant="labelSmall" style={styles.statLabel}>
              Weight
            </Text>
            <Text variant="bodyMedium" style={styles.statValue}>
              {item.weightLbs} lbs
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="labelSmall" style={styles.statLabel}>
              Smoker Temp
            </Text>
            <Text variant="bodyMedium" style={styles.statValue}>
              {item.smokerTempF}°F
            </Text>
          </View>
          {item.actualFinishTime && item.actualStartTime && (
            <View style={styles.stat}>
              <Text variant="labelSmall" style={styles.statLabel}>
                Duration
              </Text>
              <Text variant="bodyMedium" style={styles.statValue}>
                {formatDuration(item.actualStartTime, item.actualFinishTime)}
              </Text>
            </View>
          )}
        </View>

        {item.notes && (
          <Text variant="bodySmall" style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  if (isLoading && !refreshing && cookHistory.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.filterContainer}>
        <Searchbar
          placeholder="Search cooks..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#aaa"
          placeholderTextColor="#666"
        />
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => (
            <Chip
              mode={statusFilter === item ? 'flat' : 'outlined'}
              selected={statusFilter === item}
              onPress={() => setStatusFilter(item)}
              style={[
                styles.filterChip,
                statusFilter === item && styles.filterChipSelected,
              ]}
              textStyle={[
                styles.filterChipText,
                statusFilter === item && styles.filterChipTextSelected,
              ]}
            >
              {item}
            </Chip>
          )}
        />
      </Surface>

      {filteredCooks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            {cookHistory.length === 0 ? 'No Cooks Yet' : 'No Results'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {cookHistory.length === 0
              ? 'Start your first cook to build your history'
              : 'Try adjusting your search or filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCooks}
          keyExtractor={(item) => item.id}
          renderItem={renderCookItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff6b35"
              colors={['#ff6b35']}
            />
          }
        />
      )}
    </View>
  );
}

function formatMeatCut(cut: string): string {
  const formatted: Record<string, string> = {
    BRISKET: 'Brisket',
    PORK_SHOULDER: 'Pork Shoulder',
    SPARE_RIBS: 'Spare Ribs',
    BABY_BACK_RIBS: 'Baby Back Ribs',
    BEEF_RIBS: 'Beef Ribs',
  };
  return formatted[cut] || cut;
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const hours = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  const minutes = Math.floor(((endDate.getTime() - startDate.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function getStatusStyle(status: string) {
  const styles: Record<string, object> = {
    COMPLETED: { backgroundColor: '#2e7d32' },
    ACTIVE: { backgroundColor: '#ff6b35' },
    RESTING: { backgroundColor: '#f57c00' },
    CANCELLED: { backgroundColor: '#616161' },
    PLANNED: { backgroundColor: '#1f3460' },
  };
  return styles[status] || {};
}

function getOutcomeStyle(outcome: string) {
  const styles: Record<string, object> = {
    EXCELLENT: { backgroundColor: '#4caf50' },
    GOOD: { backgroundColor: '#8bc34a' },
    OKAY: { backgroundColor: '#ffc107' },
    POOR: { backgroundColor: '#f44336' },
  };
  return styles[outcome] || {};
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  filterContainer: {
    backgroundColor: '#16213e',
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    backgroundColor: '#1a1a2e',
    marginBottom: 12,
  },
  searchInput: {
    color: '#fff',
  },
  filterChips: {
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'transparent',
    borderColor: '#1f3460',
  },
  filterChipSelected: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  filterChipText: {
    color: '#aaa',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  cookCard: {
    backgroundColor: '#16213e',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meatTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateText: {
    color: '#aaa',
    marginTop: 4,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    backgroundColor: '#1f3460',
  },
  statusChipText: {
    color: '#fff',
    fontSize: 10,
  },
  outcomeChip: {
    backgroundColor: '#1f3460',
  },
  outcomeChipText: {
    color: '#fff',
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  stat: {},
  statLabel: {
    color: '#aaa',
  },
  statValue: {
    color: '#fff',
  },
  notes: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#fff',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
  },
});
