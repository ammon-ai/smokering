import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../utils/config.js';
import { ChatSource, Cook } from '@smokering/shared';

// Initialize Anthropic client if API key is available
const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

interface CookContext {
  cook: Cook;
  recentTemps: { timestamp: Date; internalTempF: number; smokerTempF?: number }[];
  elapsedMinutes: number;
}

interface ChatResult {
  content: string;
  sources: ChatSource[];
  suggestions: string[];
}

// System prompt for the Pit Assist agent
const SYSTEM_PROMPT = `You are SmokeRing's AI Pit Assist, an expert smoking meat assistant. Your role is to provide evidence-backed, practical advice during cooks.

PERSONALITY:
- Confident but honest about uncertainty
- Practical and actionable
- Focus on helping users achieve great results

RESPONSE GUIDELINES:
1. Be concise - users are often checking their phone with greasy hands
2. Always acknowledge uncertainty explicitly (use confidence levels)
3. Cite sources when available (use [Source: X] format)
4. Surface contradictions clearly ("Most sources say X, but some experienced pitmasters report Y")
5. Focus on actionable advice for the current moment

KNOWLEDGE AREAS:
- Brisket, pork shoulder, ribs cooking techniques
- Stall management and when to wrap
- Temperature management and troubleshooting
- Timing predictions and adjustments
- Equipment-specific advice for pellet, offset, kamado, electric, and kettle smokers

WHEN YOU DON'T KNOW:
- Say "I don't have enough data on this specific situation"
- Offer general guidance based on smoking principles
- Suggest what data points would help (e.g., "Knowing your smoker model would help me give better advice")

CONTEXT AWARENESS:
- You have access to the user's current cook data (meat, weight, temps, time elapsed)
- Use this context to give personalized advice
- Reference their specific situation in responses`;

/**
 * Format cook context for the AI
 */
function formatCookContext(ctx: CookContext): string {
  const { cook, recentTemps, elapsedMinutes } = ctx;

  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;

  let context = `
CURRENT COOK STATUS:
- Meat: ${cook.meatCut.replace('_', ' ')} (${cook.weightLbs} lbs)
- Target Internal Temp: ${cook.targetTempF}°F
- Smoker Temp: ${cook.smokerTempF}°F
- Wrap Method: ${cook.wrapMethod === 'NONE' ? 'Unwrapped' : cook.wrapMethod.replace('_', ' ')}
- Time Elapsed: ${hours}h ${mins}m
- Status: ${cook.status}`;

  if (recentTemps.length > 0) {
    const latest = recentTemps[0];
    context += `
- Latest Internal Temp: ${latest.internalTempF}°F`;

    if (recentTemps.length > 1) {
      const tempChange = latest.internalTempF - recentTemps[recentTemps.length - 1].internalTempF;
      const timeSpan = (new Date(latest.timestamp).getTime() - new Date(recentTemps[recentTemps.length - 1].timestamp).getTime()) / 60000;
      const rate = timeSpan > 0 ? (tempChange / timeSpan * 60).toFixed(1) : 0;
      context += `
- Temp Change Rate: ${rate}°F/hour over last ${Math.round(timeSpan)} minutes`;
    }
  }

  if (cook.ambientTempF) {
    context += `
- Ambient Temp: ${cook.ambientTempF}°F`;
  }

  if (cook.altitude) {
    context += `
- Altitude: ${cook.altitude} ft`;
  }

  return context;
}

/**
 * Route message to appropriate agent type
 */
function determineAgentType(message: string): 'planner' | 'cook_time' | 'technique' {
  const lowerMessage = message.toLowerCase();

  // Timing/scheduling questions
  if (
    lowerMessage.includes('when should') ||
    lowerMessage.includes('what time') ||
    lowerMessage.includes('how long') ||
    lowerMessage.includes('serve') ||
    lowerMessage.includes('finish') ||
    lowerMessage.includes('start')
  ) {
    return 'planner';
  }

  // Progress/prediction questions
  if (
    lowerMessage.includes('is this normal') ||
    lowerMessage.includes('on track') ||
    lowerMessage.includes('stall') ||
    lowerMessage.includes('temp') ||
    lowerMessage.includes('reading')
  ) {
    return 'cook_time';
  }

  // Default to technique for how/why questions
  return 'technique';
}

/**
 * Generate suggestions based on cook state
 */
function generateSuggestions(ctx: CookContext, message: string): string[] {
  const suggestions: string[] = [];
  const { cook, recentTemps } = ctx;

  // If in stall range
  if (recentTemps.length > 0) {
    const currentTemp = recentTemps[0].internalTempF;

    if (currentTemp >= 150 && currentTemp <= 170 && cook.wrapMethod === 'NONE') {
      suggestions.push('Should I wrap now?');
    }

    if (currentTemp >= 195 && cook.meatCut === 'BRISKET') {
      suggestions.push("Is it done? How do I check?");
    }
  }

  // Generic helpful suggestions
  if (!message.toLowerCase().includes('stall')) {
    suggestions.push('What causes the stall?');
  }

  if (!message.toLowerCase().includes('wrap')) {
    suggestions.push('Wrap vs unwrapped - what should I do?');
  }

  suggestions.push('Am I on track for my serve time?');

  return suggestions.slice(0, 3);
}

/**
 * Generate response using Claude
 */
export async function generatePitAssistResponse(
  message: string,
  context: CookContext,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<ChatResult> {
  // If no API key, return a helpful fallback
  if (!anthropic) {
    return {
      content: `I'm currently running in demo mode without AI capabilities. Here's general guidance based on your question:

For timing questions: A ${context.cook.weightLbs}lb ${context.cook.meatCut.toLowerCase().replace('_', ' ')} typically takes ${Math.round(context.cook.weightLbs * 1.25)} to ${Math.round(context.cook.weightLbs * 1.5)} hours at ${context.cook.smokerTempF}°F.

For technique questions: Check resources like AmazingRibs.com or r/smoking for detailed guidance.

To enable AI assistance, add your ANTHROPIC_API_KEY to the environment variables.`,
      sources: [],
      suggestions: generateSuggestions(context, message),
    };
  }

  const agentType = determineAgentType(message);
  const cookContext = formatCookContext(context);

  // Build conversation messages
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `${SYSTEM_PROMPT}

${cookContext}

Agent Mode: ${agentType}
${agentType === 'planner' ? 'Focus on timing, scheduling, and planning advice.' : ''}
${agentType === 'cook_time' ? 'Focus on current progress, predictions, and whether things look normal.' : ''}
${agentType === 'technique' ? 'Focus on technique explanations and troubleshooting.' : ''}`,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Unable to generate response';

    // Extract any sources mentioned (simplified - real RAG would have actual sources)
    const sources: ChatSource[] = [];
    const sourceMatches = content.match(/\[Source: ([^\]]+)\]/g);
    if (sourceMatches) {
      sourceMatches.forEach((match) => {
        const title = match.replace('[Source: ', '').replace(']', '');
        sources.push({
          title,
          excerpt: '',
          confidence: 0.8,
        });
      });
    }

    return {
      content,
      sources,
      suggestions: generateSuggestions(context, message),
    };
  } catch (error) {
    console.error('AI generation error:', error);

    return {
      content: "I'm having trouble connecting to my AI backend right now. Based on your cook data, everything looks on track. Try asking again in a moment.",
      sources: [],
      suggestions: generateSuggestions(context, message),
    };
  }
}
