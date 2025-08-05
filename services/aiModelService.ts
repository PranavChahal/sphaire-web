interface ModelGenerationResponse {
  code: string;
  backend: 'OpenCascade' | 'Babylon';
}

export const generateModelCode = async (spec: string): Promise<ModelGenerationResponse> => {
  try {
    if (!spec || typeof spec !== 'string') {
      throw new Error('Invalid specification: must be a non-empty string');
    }

    const response = await fetch('/api/generateModel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ spec }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Validate the response data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response: Expected an object');
    }

    if (typeof data.code !== 'string' || !data.code.trim()) {
      throw new Error('Invalid response: Missing or invalid code');
    }

    if (data.backend !== 'OpenCascade' && data.backend !== 'Babylon') {
      throw new Error(`Invalid response: Unknown backend "${data.backend}"`);
    }

    return {
      code: data.code,
      backend: data.backend,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AI Model Generation failed: ${error.message}`);
    }
    throw new Error('AI Model Generation failed with an unknown error');
  }
};

const aiModelService = {
  generateModelCode,
};

export default aiModelService;
