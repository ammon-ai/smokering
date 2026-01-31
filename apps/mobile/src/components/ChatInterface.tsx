import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text, TextInput, Surface, ActivityIndicator, Chip } from 'react-native-paper';
import { spacing, theme, touchTargets } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; excerpt: string; confidence: number }[];
  createdAt: Date;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  suggestions?: string[];
  isLoading?: boolean;
  cookContext?: {
    meatCut: string;
    currentTemp?: number;
    targetTemp: number;
    elapsedHours: number;
  };
}

export function ChatInterface({
  messages,
  onSendMessage,
  suggestions = [],
  isLoading,
  cookContext,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleSuggestion = async (suggestion: string) => {
    if (isLoading) return;
    await onSendMessage(suggestion);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Cook context header */}
      {cookContext && (
        <Surface style={styles.contextHeader} elevation={1}>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>
              {cookContext.meatCut.replace('_', ' ')}
            </Text>
            {cookContext.currentTemp && (
              <Text style={styles.contextTemp}>
                {cookContext.currentTemp}°F / {cookContext.targetTemp}°F
              </Text>
            )}
            <Text style={styles.contextTime}>
              {cookContext.elapsedHours.toFixed(1)}h elapsed
            </Text>
          </View>
        </Surface>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.emptyText}>
              Ask me anything about your cook!
            </Text>
            <Text style={styles.emptySubtext}>
              I can help with timing, technique, and troubleshooting.
            </Text>
          </View>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsContainer}
          contentContainerStyle={styles.suggestionsContent}
        >
          {suggestions.map((suggestion, index) => (
            <Chip
              key={index}
              onPress={() => handleSuggestion(suggestion)}
              style={styles.suggestionChip}
              textStyle={styles.suggestionText}
            >
              {suggestion}
            </Chip>
          ))}
        </ScrollView>
      )}

      {/* Input area */}
      <Surface style={styles.inputContainer} elevation={2}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your cook..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || isLoading) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={24}
            color={
              !input.trim() || isLoading
                ? theme.colors.onSurfaceDisabled
                : theme.colors.primary
            }
          />
        </Pressable>
      </Surface>
    </KeyboardAvoidingView>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

// Export ChatMessage component for use in ChatScreen
export function ChatMessage({ message }: { message: { id: string; role: string; content: string; sources?: unknown; createdAt: string } }) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={[styles.messageText, isUser && styles.userMessageText]}>
        {message.content}
      </Text>
      <Text style={styles.timestamp}>
        {new Date(message.createdAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={[styles.messageText, isUser && styles.userMessageText]}>
        {message.content}
      </Text>

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          <Text style={styles.sourcesLabel}>Sources:</Text>
          {message.sources.map((source, index) => (
            <Text key={index} style={styles.sourceItem}>
              • {source.title}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.timestamp}>
        {new Date(message.createdAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contextHeader: {
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textTransform: 'capitalize',
  },
  contextTemp: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  contextTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceVariant,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.onPrimary,
  },
  sourcesContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  sourcesLabel: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  sourceItem: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  suggestionsContainer: {
    maxHeight: 50,
  },
  suggestionsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  suggestionChip: {
    backgroundColor: theme.colors.surfaceVariant,
    marginRight: spacing.sm,
  },
  suggestionText: {
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 15,
    color: theme.colors.onSurface,
  },
  sendButton: {
    width: touchTargets.minimum,
    height: touchTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonPressed: {
    opacity: 0.7,
  },
});
