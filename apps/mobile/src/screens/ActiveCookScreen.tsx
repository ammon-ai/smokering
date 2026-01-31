import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Surface,
  Button,
  Chip,
  ActivityIndicator,
  FAB,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { api } from '../services/api';
import { Timeline } from '../components/Timeline';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator';
import { TempLogger } from '../components/TempLogger';
import type { Cook, TempReading } from '@smokering/shared';

type RootStackParamList = {
  Main: undefined;
  Chat: { cookId: string };
};

type ActiveCookRouteParams = {
  ActiveCook: { cookId: string };
};

export default function ActiveCookScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ActiveCookRouteParams, 'ActiveCook'>>();
  const { cookId } = route.params;

  const [cook, setCook] = useState<Cook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTempLogger, setShowTempLogger] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [outcome, setOutcome] = useState<string>('GOOD');
  const [notes, setNotes] = useState('');

  const fetchCook = useCallback(async () => {
    try {
      const response = await api.getCook(cookId);
      if (response.success && response.data) {
        setCook(response.data as Cook);
      }
    } catch (error) {
      console.error('Failed to fetch cook:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cookId]);

  useEffect(() => {
    fetchCook();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchCook, 30000);
    return () => clearInterval(interval);
  }, [fetchCook]);

  const handleStartCook = async () => {
    setIsSaving(true);
    try {
      const response = await api.startCook(cookId);
      if (response.success) {
        fetchCook();
      } else {
        Alert.alert('Error', response.error || 'Failed to start cook');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogTemp = async (data: { internalTempF: number; smokerTempF?: number }) => {
    setIsSaving(true);
    try {
      const response = await api.logTemp(cookId, data);
      if (response.success) {
        setShowTempLogger(false);
        fetchCook();
      } else {
        Alert.alert('Error', response.error || 'Failed to log temperature');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteCook = async () => {
    setIsSaving(true);
    try {
      const lastReading = cook?.tempReadings?.[cook.tempReadings.length - 1];
      const response = await api.completeCook(cookId, {
        finishTempF: lastReading?.internalTempF || cook?.targetTempF,
        outcome,
        notes,
      });
      if (response.success) {
        setShowCompleteModal(false);
        navigation.navigate('Main');
      } else {
        Alert.alert('Error', response.error || 'Failed to complete cook');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChat = () => {
    navigation.navigate('Chat', { cookId });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  if (!cook) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="headlineSmall" style={styles.errorText}>
          Cook not found
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const lastReading = cook.tempReadings?.[cook.tempReadings.length - 1];
  const currentPhase = cook.phases?.find((p) => p.actualStart && !p.actualEnd);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Header */}
        <Surface style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text variant="headlineMedium" style={styles.meatTitle}>
                {formatMeatCut(cook.meatCut)}
              </Text>
              <Text variant="bodyMedium" style={styles.weightText}>
                {cook.weightLbs} lbs • {cook.smokerTempF}°F
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[styles.statusChip, getStatusStyle(cook.status)]}
            >
              {cook.status}
            </Chip>
          </View>

          {cook.status === 'PLANNED' && (
            <Button
              mode="contained"
              onPress={handleStartCook}
              loading={isSaving}
              buttonColor="#ff6b35"
              style={styles.startButton}
            >
              Start Cook Now
            </Button>
          )}
        </Surface>

        {/* Current Temperature */}
        {cook.status === 'ACTIVE' && (
          <Surface style={styles.tempCard}>
            <View style={styles.tempHeader}>
              <Text variant="labelMedium" style={styles.tempLabel}>
                Current Internal Temp
              </Text>
              {currentPhase && (
                <Chip mode="flat" style={styles.phaseChip}>
                  {currentPhase.name}
                </Chip>
              )}
            </View>
            <Text variant="displayLarge" style={styles.tempValue}>
              {lastReading?.internalTempF || '--'}°F
            </Text>
            <Text variant="bodySmall" style={styles.targetText}>
              Target: {cook.targetTempF}°F
            </Text>
            {lastReading && (
              <Text variant="bodySmall" style={styles.lastLogText}>
                Last logged: {format(new Date(lastReading.timestamp), 'h:mm a')}
              </Text>
            )}
          </Surface>
        )}

        {/* Prediction */}
        {cook.predictedFinishTime && cook.status !== 'COMPLETED' && (
          <Surface style={styles.predictionCard}>
            <Text variant="labelMedium" style={styles.predictionLabel}>
              Predicted Finish
            </Text>
            <Text variant="headlineLarge" style={styles.predictionTime}>
              {format(new Date(cook.predictedFinishTime), 'h:mm a')}
            </Text>
            <ConfidenceIndicator confidence={75} size="small" />
          </Surface>
        )}

        {/* Timeline */}
        {cook.phases && cook.phases.length > 0 && (
          <Surface style={styles.timelineCard}>
            <Text variant="titleMedium" style={styles.timelineTitle}>
              Cook Timeline
            </Text>
            <Timeline phases={cook.phases} />
          </Surface>
        )}

        {/* Temperature History */}
        {cook.tempReadings && cook.tempReadings.length > 0 && (
          <Surface style={styles.historyCard}>
            <Text variant="titleMedium" style={styles.historyTitle}>
              Temperature Log
            </Text>
            {cook.tempReadings.slice(-5).reverse().map((reading: TempReading) => (
              <View key={reading.id} style={styles.readingRow}>
                <Text variant="bodyMedium" style={styles.readingTime}>
                  {format(new Date(reading.timestamp), 'h:mm a')}
                </Text>
                <Text variant="bodyLarge" style={styles.readingTemp}>
                  {reading.internalTempF}°F
                </Text>
                {reading.smokerTempF && (
                  <Text variant="bodySmall" style={styles.smokerTemp}>
                    Smoker: {reading.smokerTempF}°F
                  </Text>
                )}
              </View>
            ))}
          </Surface>
        )}

        {/* Action Buttons */}
        {cook.status === 'ACTIVE' && (
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowCompleteModal(true)}
              style={styles.completeButton}
              textColor="#4caf50"
            >
              Complete Cook
            </Button>
          </View>
        )}
      </ScrollView>

      {/* FABs */}
      {cook.status === 'ACTIVE' && (
        <View style={styles.fabContainer}>
          <FAB
            icon="chat"
            onPress={handleOpenChat}
            style={[styles.fab, styles.chatFab]}
            color="#fff"
          />
          <FAB
            icon="thermometer"
            onPress={() => setShowTempLogger(true)}
            style={styles.fab}
            color="#fff"
            label="Log Temp"
          />
        </View>
      )}

      {/* Temperature Logger Modal */}
      <Portal>
        <Modal
          visible={showTempLogger}
          onDismiss={() => setShowTempLogger(false)}
          contentContainerStyle={styles.modal}
        >
          <TempLogger
            onSubmit={handleLogTemp}
            onCancel={() => setShowTempLogger(false)}
            isLoading={isSaving}
          />
        </Modal>
      </Portal>

      {/* Complete Cook Modal */}
      <Portal>
        <Modal
          visible={showCompleteModal}
          onDismiss={() => setShowCompleteModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Complete Cook
          </Text>

          <Text variant="labelLarge" style={styles.fieldLabel}>
            How did it turn out?
          </Text>
          <View style={styles.outcomeRow}>
            {['EXCELLENT', 'GOOD', 'OKAY', 'POOR'].map((o) => (
              <Chip
                key={o}
                selected={outcome === o}
                onPress={() => setOutcome(o)}
                style={[styles.outcomeChip, outcome === o && styles.outcomeChipSelected]}
                textStyle={outcome === o ? styles.outcomeTextSelected : undefined}
              >
                {o}
              </Chip>
            ))}
          </View>

          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowCompleteModal(false)}
              textColor="#aaa"
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleCompleteCook}
              loading={isSaving}
              buttonColor="#4caf50"
            >
              Complete
            </Button>
          </View>
        </Modal>
      </Portal>
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

function getStatusStyle(status: string) {
  const styles: Record<string, object> = {
    ACTIVE: { backgroundColor: '#ff6b35' },
    RESTING: { backgroundColor: '#f57c00' },
    COMPLETED: { backgroundColor: '#4caf50' },
    PLANNED: { backgroundColor: '#1f3460' },
  };
  return styles[status] || {};
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  startButton: {
    marginTop: 16,
  },
  tempCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  tempHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tempLabel: {
    color: '#aaa',
  },
  phaseChip: {
    backgroundColor: '#ff6b35',
  },
  tempValue: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  targetText: {
    color: '#aaa',
    marginTop: 8,
  },
  lastLogText: {
    color: '#666',
    marginTop: 4,
  },
  predictionCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  predictionLabel: {
    color: '#aaa',
  },
  predictionTime: {
    color: '#fff',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  timelineCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timelineTitle: {
    color: '#ff6b35',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  historyTitle: {
    color: '#ff6b35',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f3460',
  },
  readingTime: {
    color: '#aaa',
    width: 80,
  },
  readingTemp: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  smokerTemp: {
    color: '#666',
  },
  actionButtons: {
    marginTop: 8,
  },
  completeButton: {
    borderColor: '#4caf50',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 12,
  },
  fab: {
    backgroundColor: '#ff6b35',
  },
  chatFab: {
    backgroundColor: '#16213e',
  },
  modal: {
    backgroundColor: '#16213e',
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  fieldLabel: {
    color: '#aaa',
    marginBottom: 12,
  },
  outcomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  outcomeChip: {
    backgroundColor: '#1a1a2e',
  },
  outcomeChipSelected: {
    backgroundColor: '#ff6b35',
  },
  outcomeTextSelected: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: '#1a1a2e',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
