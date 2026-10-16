const DEFAULT_MODEL = 'gemini-2.5-flash';

export class GeminiProvider {
  constructor(config = {}) {
    this.endpoint = config.endpoint || '';
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODEL;
  }

  async generate({ prompt, mode = 'explain', signal } = {}) {
    if (!prompt?.trim()) throw new Error('Enter a question or paste notes first.');
    if (!this.endpoint) throw new Error('No Gemini provider endpoint is configured. Add a backend proxy URL in Settings.');

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, mode, prompt, apiKey: this.apiKey || undefined }),
      signal
    });
    if (response.status === 429) throw new Error('The AI provider is rate-limited. Please wait and try again.');
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).error?.message || ''; } catch {}
      throw new Error(`AI provider error (${response.status})${detail ? `: ${detail}` : ''}`);
    }
    const data = await response.json();
    return data.text || data.output || data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 'No response text returned.';
  }
}

export function buildStudyPrompt(mode, input) {
  const safe = String(input || '').trim();
  const instructions = {
    explain: 'Explain the concept clearly, using a simple example and key takeaways.',
    summarize: 'Summarize the supplied notes into concise study points without inventing facts.',
    hint: 'Give conceptual hints and a solution strategy. Do not provide a direct answer to an active graded assessment.',
    practice: 'Walk through a similar practice problem step by step. Do not answer an active graded assessment.'
  };
  return `${instructions[mode] || instructions.explain}\n\nMaterial/question:\n${safe}`;
}

export const __testing = { buildStudyPrompt };
