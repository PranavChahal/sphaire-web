import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIResponse {
  content: string;
  model: string;
  tokenCount: number;
  source: 'local' | 'openai';
}

export class HybridAIService {
  private localLLMAvailable: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000;

  private async isLocalLLMAvailable(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.localLLMAvailable;
    }

    try {
      // Local LLM health check disabled for now
      this.localLLMAvailable = false;
      this.lastHealthCheck = now;
      return this.localLLMAvailable;
    } catch {
      this.localLLMAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  async generateCode(prompt: string, options: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    systemPrompt?: string;
  } = {}): Promise<AIResponse> {
    const {
      maxTokens = 512,
      temperature = 0.2,
      topP = 0.95,
      systemPrompt = ''
    } = options;

    // Local LLM disabled - always use OpenAI
    console.log('🌐 HYBRID-AI: Using OpenAI...');

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Neither local LLM nor OpenAI is available. Please start the local server or configure OpenAI API key.');
    }

    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system' as const,
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user' as const,
        content: prompt
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      
      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      console.log('HYBRID-AI: OpenAI fallback succeeded');
      
      return {
        content,
        model: 'gpt-4o-mini (OpenAI fallback)',
        tokenCount: response.usage?.total_tokens || 0,
        source: 'openai'
      };

    } catch (error) {
      console.error('HYBRID-AI: Both local and OpenAI failed:', error);
      throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(): Promise<{
    localLLM: boolean;
    openAI: boolean;
    activeService: 'local' | 'openai' | 'none';
  }> {
    const localAvailable = await this.isLocalLLMAvailable();
    const openAIAvailable = !!process.env.OPENAI_API_KEY;

    return {
      localLLM: localAvailable,
      openAI: openAIAvailable,
      activeService: localAvailable ? 'local' : (openAIAvailable ? 'openai' : 'none')
    };
  }
}

export const hybridAI = new HybridAIService();
