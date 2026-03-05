# Adding a New Agent

Follow this pattern every time you add a new agent to the pipeline.
Agents are NestJS services inside the `backend/src/agents/` directory.

## File structure for a new agent

```
backend/src/agents/
└── my-new/
    ├── my-new.agent.ts       ← the agent service
    └── my-new.agent.spec.ts  ← unit tests
```

## Agent service template

```typescript
// backend/src/agents/my-new/my-new.agent.ts
import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { AI_MODELS } from '../../config/models.config';

@Injectable()
export class MyNewAgent {
  private readonly logger = new Logger(MyNewAgent.name);

  constructor(private readonly aiProvider: AiProviderService) {}

  async run(input: string, context?: Record<string, unknown>): Promise<string> {
    this.logger.log(`Running MyNewAgent — input length: ${input.length}`);

    const result = await this.aiProvider.complete({
      model: AI_MODELS.quickQA,  // Configurable model ID
      systemPrompt: 'You are a specialist agent. Do X.',
      userPrompt: input,
    });

    return result;
  }
}
```

## Rules for agents

1. **Agents never call each other directly.** All orchestration goes through `OrchestratorService`.
2. **Agents never call the DB directly.** Use injected services (KbService, ChatService, etc.) if persistence is needed.
3. **All AI Provider calls go through `AiProviderService`.** Never instantiate `axios` in an agent.
4. **Log the start and end of every agent run** using NestJS `Logger` — the context string is the agent class name.
5. **Agents must be stateless.** No instance variables that persist between calls.

## Register the agent in AgentsModule

```typescript
// backend/src/agents/agents.module.ts
import { MyNewAgent } from './my-new/my-new.agent';

@Module({
  providers: [
    OrchestratorService,
    SearchAgent,
    ReaderAgent,
    SummarizerAgent,
    SynthesizerAgent,
    KbAgent,
    ReportWriterAgent,
    MyNewAgent,    // ← add here
  ],
  exports: [OrchestratorService],
})
export class AgentsModule {}
```

## Wire it into OrchestratorService

```typescript
// backend/src/agents/orchestrator/orchestrator.service.ts
constructor(
  private readonly searchAgent: SearchAgent,
  private readonly readerAgent: ReaderAgent,
  // ...
  private readonly myNewAgent: MyNewAgent,  // ← inject here
) {}
```

## SSE progress step convention

If your agent is part of a streaming pipeline, emit a progress step before running:

```typescript
yield { event: 'progress', data: JSON.stringify({ step: 'my_new_step', message: 'Running my new step...' }) };
const result = await this.myNewAgent.run(input);
```

Step names use `snake_case`. Message is user-facing.

## Model Configuration

All model IDs are defined in `backend/src/config/models.config.ts`:

```typescript
// backend/src/config/models.config.ts
export const AI_MODELS = {
  orchestration: process.env.AI_MODEL_ORCHESTRATION || 'deepseek/deepseek-r1:free',
  summarization: process.env.AI_MODEL_SUMMARIZATION || 'meta-llama/llama-3.3-70b-instruct:free',
  quickQA: process.env.AI_MODEL_QUICK_QA || 'google/gemma-2-9b-it:free',
  reportWriting: process.env.AI_MODEL_REPORT || 'mistralai/mistral-7b-instruct:free',
} as const;
```

Never hardcode model IDs in agents. Always import from the config file. This allows swapping models via environment variables without code changes.
