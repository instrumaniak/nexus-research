export function getAiModels() {
  return {
    orchestration: process.env.AI_MODEL_ORCHESTRATION ?? 'deepseek/deepseek-r1:free',
    summarization: process.env.AI_MODEL_SUMMARIZATION ?? 'meta-llama/llama-3.3-70b-instruct:free',
    quickQA: process.env.AI_MODEL_QUICK_QA ?? 'google/gemma-2-9b-it:free',
    reportWriting: process.env.AI_MODEL_REPORT ?? 'mistralai/mistral-7b-instruct:free',
  } as const;
}
