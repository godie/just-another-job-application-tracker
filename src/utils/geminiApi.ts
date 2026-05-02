interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
}

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: string;
  parts: GeminiContentPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: GeminiGenerationConfig;
  systemInstruction?: {
    parts: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
}

export async function callGeminiApi(
  apiKey: string,
  prompt: string,
  options?: {
    generationConfig?: GeminiGenerationConfig;
    systemInstruction?: string;
  }
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (options?.generationConfig) {
    body.generationConfig = options.generationConfig;
  }

  if (options?.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.error?.message || `Gemini API error: ${response.status}`;
    throw new Error(message);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
}
