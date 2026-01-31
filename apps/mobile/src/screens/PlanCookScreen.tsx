import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Surface,
  Button,
  TextInput,
  SegmentedButtons,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { api } from '../services/api';
import { Timeline } from '../components/Timeline';
import { ConfidenceIndicator } from '../components/ConfidenceIndicator';
import { MEAT_CUTS, SMOKER_TYPES, WRAP_METHODS } from '@smokering/shared';
import type { CookPlan } from '@smokering/shared';

type RootStackParamList = {
  ActiveCook: { cookId: string };
};

const meatCutOptions = Object.entries(MEAT_CUTS).map(([value, label]) => ({
  value,
  label: label.split(' ')[0], // Shortened for display
}));

const smokerTypeOptions = Object.entries(SMOKER_TYPES).map(([value, label]) => ({
  value,
  label,
}));

const wrapMethodOptions = Object.entries(WRAP_METHODS).map(([value, label]) => ({
  value,
  label,
}));

export default function PlanCookScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<CookPlan | null>(null);

  // Form state
  const [meatCut, setMeatCut] = useState('BRISKET');
  const [weightLbs, setWeightLbs] = useState('12');
  const [smokerType, setSmokerType] = useState('PELLET');
  const [smokerTempF, setSmokerTempF] = useState('225');
  const [wrapMethod, setWrapMethod] = useState('BUTCHER_PAPER');
  const [serveTime, setServeTime] = useState(new Date(Date.now() + 12 * 60 * 60 * 1000)); // 12 hours from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [ambientTempF, setAmbientTempF] = useState('');
  const [altitude, setAltitude] = useState('');

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    try {
      const response = await api.planCook({
        meatCut,
        weightLbs: parseFloat(weightLbs),
        smokerType,
        smokerTempF: parseInt(smokerTempF),
        wrapMethod,
        serveTime: serveTime.toISOString(),
        ambientTempF: ambientTempF ? parseInt(ambientTempF) : undefined,
        altitude: altitude ? parseInt(altitude) : undefined,
      });

      if (response.success && response.data) {
        setPlan(response.data as CookPlan);
        setStep(2);
      } else {
        Alert.alert('Error', response.error || 'Failed to generate plan');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCook = async () => {
    if (!plan) return;

    setIsLoading(true);
    try {
      const response = await api.createCook({
        meatCut,
        weightLbs: parseFloat(weightLbs),
        targetTempF: meatCut === 'BRISKET' || meatCut === 'PORK_SHOULDER' ? 203 : 195,
        smokerTempF: parseInt(smokerTempF),
        wrapMethod,
        plannedServeTime: serveTime.toISOString(),
        predictedFinishTime: plan.predictedFinishTime,
        ambientTempF: ambientTempF ? parseInt(ambientTempF) : undefined,
        altitude: altitude ? parseInt(altitude) : undefined,
      });

      if (response.success && response.data) {
        const cook = response.data as { id: string };
        navigation.replace('ActiveCook', { cookId: cook.id });
      } else {
        Alert.alert('Error', response.error || 'Failed to create cook');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 2 && plan) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Surface style={styles.planCard}>
          <Text variant="headlineSmall" style={styles.planTitle}>
            Your Cook Route
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>
                Meat
              </Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                {MEAT_CUTS[meatCut as keyof typeof MEAT_CUTS]}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>
                Weight
              </Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                {weightLbs} lbs
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="labelSmall" style={styles.summaryLabel}>
                Temp
              </Text>
              <Text variant="titleMedium" style={styles.summaryValue}>
                {smokerTempF}°F
              </Text>
            </View>
          </View>
        </Surface>

        <Surface style={styles.predictionCard}>
          <Text variant="labelMedium" style={styles.predictionLabel}>
            Predicted Finish Time
          </Text>
          <Text variant="displaySmall" style={styles.predictionTime}>
            {format(new Date(plan.predictedFinishTime), 'h:mm a')}
          </Text>
          <Text variant="bodySmall" style={styles.predictionDate}>
            {format(new Date(plan.predictedFinishTime), 'EEEE, MMM d')}
          </Text>

          <View style={styles.confidenceRow}>
            <ConfidenceIndicator confidence={plan.overallConfidence} />
            <Text variant="bodySmall" style={styles.rangeText}>
              ± {getTimeRange(plan)}
            </Text>
          </View>
        </Surface>

        <Surface style={styles.timelineCard}>
          <Text variant="titleMedium" style={styles.timelineTitle}>
            Cook Timeline
          </Text>
          <Timeline phases={plan.phases} />
        </Surface>

        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => setStep(1)}
            style={styles.backButton}
            textColor="#aaa"
          >
            Adjust Plan
          </Button>
          <Button
            mode="contained"
            onPress={handleStartCook}
            loading={isLoading}
            disabled={isLoading}
            buttonColor="#ff6b35"
            style={styles.startButton}
          >
            Start Cook
          </Button>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          What are you cooking?
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {meatCutOptions.map((option) => (
              <Chip
                key={option.value}
                selected={meatCut === option.value}
                onPress={() => setMeatCut(option.value)}
                style={[
                  styles.chip,
                  meatCut === option.value && styles.chipSelected,
                ]}
                textStyle={[
                  styles.chipText,
                  meatCut === option.value && styles.chipTextSelected,
                ]}
                showSelectedCheck={false}
              >
                {MEAT_CUTS[option.value as keyof typeof MEAT_CUTS]}
              </Chip>
            ))}
          </View>
        </ScrollView>

        <TextInput
          label="Weight (lbs)"
          value={weightLbs}
          onChangeText={setWeightLbs}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          outlineColor="#1f3460"
          activeOutlineColor="#ff6b35"
          textColor="#fff"
        />
      </Surface>

      <Surface style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Smoker Setup
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {smokerTypeOptions.map((option) => (
              <Chip
                key={option.value}
                selected={smokerType === option.value}
                onPress={() => setSmokerType(option.value)}
                style={[
                  styles.chip,
                  smokerType === option.value && styles.chipSelected,
                ]}
                textStyle={[
                  styles.chipText,
                  smokerType === option.value && styles.chipTextSelected,
                ]}
                showSelectedCheck={false}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </ScrollView>

        <TextInput
          label="Smoker Temperature (°F)"
          value={smokerTempF}
          onChangeText={setSmokerTempF}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          outlineColor="#1f3460"
          activeOutlineColor="#ff6b35"
          textColor="#fff"
        />

        <Text variant="labelLarge" style={styles.fieldLabel}>
          Wrap Method
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {wrapMethodOptions.map((option) => (
              <Chip
                key={option.value}
                selected={wrapMethod === option.value}
                onPress={() => setWrapMethod(option.value)}
                style={[
                  styles.chip,
                  wrapMethod === option.value && styles.chipSelected,
                ]}
                textStyle={[
                  styles.chipText,
                  wrapMethod === option.value && styles.chipTextSelected,
                ]}
                showSelectedCheck={false}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </Surface>

      <Surface style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          When do you want to serve?
        </Text>

        <View style={styles.dateTimeRow}>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            icon="calendar"
            style={styles.dateButton}
            textColor="#ff8c42"
          >
            {format(serveTime, 'MMM d')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowTimePicker(true)}
            icon="clock"
            style={styles.dateButton}
            textColor="#ff8c42"
          >
            {format(serveTime, 'h:mm a')}
          </Button>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={serveTime}
            mode="date"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                const newDate = new Date(serveTime);
                newDate.setFullYear(date.getFullYear());
                newDate.setMonth(date.getMonth());
                newDate.setDate(date.getDate());
                setServeTime(newDate);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={serveTime}
            mode="time"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (date) {
                const newDate = new Date(serveTime);
                newDate.setHours(date.getHours());
                newDate.setMinutes(date.getMinutes());
                setServeTime(newDate);
              }
            }}
          />
        )}
      </Surface>

      <Surface style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Conditions (Optional)
        </Text>
        <View style={styles.optionalRow}>
          <TextInput
            label="Ambient Temp (°F)"
            value={ambientTempF}
            onChangeText={setAmbientTempF}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
          />
          <TextInput
            label="Altitude (ft)"
            value={altitude}
            onChangeText={setAltitude}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
          />
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={handleGeneratePlan}
        loading={isLoading}
        disabled={isLoading || !weightLbs || !smokerTempF}
        style={styles.generateButton}
        buttonColor="#ff6b35"
        contentStyle={styles.generateButtonContent}
      >
        Generate Cook Route
      </Button>
    </ScrollView>
  );
}

function getTimeRange(plan: CookPlan): string {
  const min = new Date(plan.confidenceRange.min);
  const max = new Date(plan.confidenceRange.max);
  const diffMinutes = Math.round((max.getTime() - min.getTime()) / (2 * 60 * 1000));

  if (diffMinutes >= 60) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${diffMinutes}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ff6b35',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1f3460',
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#ff6b35',
    borderColor: '#ff6b35',
  },
  chipText: {
    color: '#aaa',
  },
  chipTextSelected: {
    color: '#fff',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  fieldLabel: {
    color: '#aaa',
    marginTop: 8,
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    borderColor: '#1f3460',
  },
  optionalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  generateButton: {
    marginTop: 8,
  },
  generateButtonContent: {
    paddingVertical: 8,
  },
  // Plan view styles
  planCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  planTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#aaa',
  },
  summaryValue: {
    color: '#fff',
    fontWeight: 'bold',
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
    color: '#ff6b35',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  predictionDate: {
    color: '#aaa',
    marginBottom: 16,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeText: {
    color: '#aaa',
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    borderColor: '#1f3460',
  },
  startButton: {
    flex: 2,
  },
});
