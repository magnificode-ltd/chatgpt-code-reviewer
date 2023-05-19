import { getInput } from '@actions/core';
import fetch from 'node-fetch';

import errorsConfig, { ErrorMessage } from '../../config/errorsConfig';
import promptsConfig, { Prompt } from '../../config/promptsConfig';

const OPENAI_MODEL = getInput('model') || 'gpt-3.5-turbo';

const getOpenAiSuggestions = async (patch: string): Promise<any> => {
  if (!patch) {
    throw new Error(
      errorsConfig[ErrorMessage.MISSING_PATCH_FOR_OPENAI_SUGGESTION],
    );
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer  ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: promptsConfig[Prompt.SYSTEM_PROMPT] },
          { role: 'user', content: patch },
        ],
      }),
    });

    if (!response.ok) throw new Error('Failed to post data.');

    const responseJson = (await response.json()) as any;

    const openAiSuggestion =
      responseJson.choices.shift()?.message?.content || '';

    return openAiSuggestion;
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
};

export default getOpenAiSuggestions;
