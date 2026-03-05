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
import { OpenRouterService } from '../openrouter/openrouter.service';

@Injectable()
export class MyNewAgent {
  private readonly logger = new Logger(MyNewAgent.name);

  constructor(private readonly openrouter: OpenRouterService) {}

  async run(input: string, context?: Record<string, unknown>): Promise<string> {
    this.logger.log(`Running MyNewAgent — input length: ${input.length}`);

    const result = await this.openrouter.complete({
      model: 'google/gemma-2-9b-it:free',
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
3. **All OpenRouter calls go through `OpenRouterService`.** Never instantiate `axios` in an agent.
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
