import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, Surface, Chip, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCookStore } from '../stores/cookStore';
import { Timeline } from '../components/Timeline';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator';
import type { Cook, CookPhase } from '@smokering/shared';

type RootStackParamList = {
  Main: undefined;
  PlanCook: undefined;
  ActiveCook: { cookId: string };
  Chat: { cookId: string };
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeCook, fetchActiveCook, isLoading } = useCookStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchActiveCook();
  }, [fetchActiveCook]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStartNewCook = () => {
    navigation.navigate('PlanCook');
  };

  const handleViewActiveCook = () => {
    if (activeCook) {
      navigation.navigate('ActiveCook', { cookId: activeCook.id });
    }
  };

  const handleOpenChat = () => {
    if (activeCook) {
      navigation.navigate('Chat', { cookId: activeCook.id });
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff6b35"
            colors={['#ff6b35']}
          />
        }
      >
        {activeCook ? (
          <ActiveCookCard
            cook={activeCook}
            onViewDetails={handleViewActiveCook}
            onOpenChat={handleOpenChat}
          />
        ) : (
          <NoCookCard onStartCook={handleStartNewCook} />
        )}

        <Surface style={styles.tipsCard}>
          <Text variant="titleMedium" style={styles.tipsTitle}>
            Quick Tips
          </Text>
          <Text variant="bodyMedium" style={styles.tipText}>
            Plan your cook backwards from serve time for best results
          </Text>
          <Text variant="bodyMedium" style={styles.tipText}>
            Log temps every 30-45 minutes for accurate predictions
          </Text>
          <Text variant="bodyMedium" style={styles.tipText}>
            Ask AI Pit Assist when you hit the stall!
          </Text>
        </Surface>
      </ScrollView>

      {!activeCook && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleStartNewCook}
          color="#fff"
        />
      )}
    </View>
  );
}

interface ActiveCookCardProps {
  cook: Cook;
  onViewDetails: () => void;
  onOpenChat: () => void;
}

function ActiveCookCard({ cook, onViewDetails, onOpenChat }: ActiveCookCardProps) {
  const currentPhase = cook.phases?.find(
    (p: CookPhase) => p.actualStart && !p.actualEnd
  );

  return (
    <Card style={styles.activeCookCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="headlineMedium" style={styles.meatTitle}>
              {formatMeatCut(cook.meatCut)}
            </Text>
            <Text variant="bodyMedium" style={styles.weightText}>
              {cook.weightLbs} lbs
            </Text>
          </View>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              cook.status === 'ACTIVE' && styles.activeChip,
              cook.status === 'RESTING' && styles.restingChip,
            ]}
          >
            {cook.status}
          </Chip>
        </View>

        {currentPhase && (
          <View style={styles.phaseInfo}>
            <Text variant="titleSmall" style={styles.phaseLabel}>
              Current Phase
            </Text>
            <Text variant="titleLarge" style={styles.phaseName}>
              {currentPhase.name}
            </Text>
          </View>
        )}

        {cook.predictedFinishTime && (
          <View style={styles.predictionSection}>
            <Text variant="bodySmall" style={styles.predictionLabel}>
              Predicted Finish
            </Text>
            <Text variant="headlineSmall" style={styles.predictionTime}>
              {format(new Date(cook.predictedFinishTime), 'h:mm a')}
            </Text>
            <ConfidenceIndicator confidence={75} size="small" />
          </View>
        )}

        {cook.phases && cook.phases.length > 0 && (
          <Timeline phases={cook.phases} compact />
        )}
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="outlined"
          onPress={onOpenChat}
          icon="chat"
          textColor="#ff8c42"
        >
          Ask AI
        </Button>
        <Button mode="contained" onPress={onViewDetails} buttonColor="#ff6b35">
          View Cook
        </Button>
      </Card.Actions>
    </Card>
  );
}

function NoCookCard({ onStartCook }: { onStartCook: () => void }) {
  return (
    <Card style={styles.noCookCard}>
      <Card.Content style={styles.noCookContent}>
        <Text variant="headlineMedium" style={styles.noCookTitle}>
          Ready to Cook?
        </Text>
        <Text variant="bodyLarge" style={styles.noCookText}>
          Plan your next smoke session with AI-powered predictions
        </Text>
        <Button
          mode="contained"
          onPress={onStartCook}
          icon="plus"
          style={styles.startButton}
          buttonColor="#ff6b35"
        >
          Plan a Cook
        </Button>
      </Card.Content>
    </Card>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  activeCookCard: {
    backgroundColor: '#16213e',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  meatTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  weightText: {
    color: '#aaa',
    marginTop: 4,
  },
  statusChip: {
    backgroundColor: '#1f3460',
  },
  activeChip: {
    backgroundColor: '#2e7d32',
  },
  restingChip: {
    backgroundColor: '#f57c00',
  },
  phaseInfo: {
    marginBottom: 16,
  },
  phaseLabel: {
    color: '#aaa',
  },
  phaseName: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  predictionSection: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f3460',
    borderRadius: 12,
    marginBottom: 16,
  },
  predictionLabel: {
    color: '#aaa',
  },
  predictionTime: {
    color: '#fff',
    fontWeight: 'bold',
    marginVertical: 4,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  noCookCard: {
    backgroundColor: '#16213e',
    marginBottom: 16,
  },
  noCookContent: {
    alignItems: 'center',
    padding: 24,
  },
  noCookTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noCookText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    paddingHorizontal: 24,
  },
  tipsCard: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    color: '#ff6b35',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  tipText: {
    color: '#ccc',
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#ff6b35',
  },
});
