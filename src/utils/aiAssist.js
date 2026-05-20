export const AI_PROVIDERS = [
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/', scheme: 'chatgpt://' },
  { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app', scheme: 'google-gemini://' },
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new', scheme: 'claude://' }
];

export const buildAiPrompt = (question, topicName = '') => {
  if (!question) return '';

  const options = (question.options || [])
    .map((opt, idx) => `${idx + 1}. ${String(opt ?? '')}`)
    .join('\n');

  const correctAnswer = question.options?.[question.correctOptionIndex] ?? '';

  return [
    'Помоги мне разобрать тестовый вопрос пошагово и простыми словами.',
    topicName ? `Тема: ${topicName}` : '',
    `Вопрос: ${question.questionText || ''}`,
    'Варианты ответа:',
    options,
    `Правильный ответ: ${String(correctAnswer)}`,
    question.explanation ? `Текущий разбор: ${question.explanation}` : '',
    'Сделай:',
    '1) Короткую интуицию',
    '2) Формальное решение',
    '3) Почему другие варианты неверны',
    '4) Похожее мини-упражнение для закрепления'
  ].filter(Boolean).join('\n\n');
};

export const askAi = async ({ providerId, prompt }) => {
  const provider = AI_PROVIDERS.find(p => p.id === providerId) || AI_PROVIDERS[0];
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const url = (isMobile && provider.scheme) ? provider.scheme : provider.url;
  
  let copied = false;

  try {
    await navigator.clipboard.writeText(prompt);
    copied = true;
  } catch (err) {
    console.warn('Failed to copy prompt to clipboard', err);
  }

  return {
    copied,
    providerLabel: provider.label,
    url
  };
};
