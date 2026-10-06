import { supabase } from './supabase';
import { SITE } from './site';

/** What the `ai-advisor` Edge Function returns. */
export interface AiPlan {
  headline: string;
  summary: string;
  steps: { title: string; detail: string; timeframe: string }[];
  watchOuts: string[];
  answer?: string;
}

export const aiAvailable = () => SITE.aiExplainer && Boolean(supabase);

/**
 * Asks the AI (Google Gemini, via the `ai-advisor` Edge Function) to explain the plan Tenura computed. Only the anonymised
 * snapshot is sent — no names of people, card numbers or account numbers.
 */
export async function explainPlan(snapshot: unknown, question?: string): Promise<AiPlan> {
  if (!supabase) throw new Error('The AI planner needs cloud sync.');
  const { data, error } = await supabase.functions.invoke('ai-advisor', { body: { snapshot, question: question?.trim() || undefined } });
  if (error) {
    // Surface the function's own message ("daily limit reached", …) when there is one
    const context = (error as { context?: Response }).context;
    const body = context && typeof context.json === 'function' ? await context.json().catch(() => null) : null;
    throw new Error(body?.error || 'The AI planner isn’t available right now. Try again in a minute.');
  }
  return data as AiPlan;
}
