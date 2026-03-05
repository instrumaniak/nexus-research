# New Agent Scaffold

Create a new NestJS agent service following the Nexus agent pattern.

## Instructions

Read `docs/guides/ADDING_AN_AGENT.md` first.

Then create the following files:
1. `backend/src/agents/<name>/<name>.agent.ts` — agent service
2. `backend/src/agents/<name>/<name>.agent.spec.ts` — unit test skeleton

Then update:
3. `backend/src/agents/agents.module.ts` — add to providers array
4. `backend/src/agents/orchestrator/orchestrator.service.ts` — inject and wire

The agent name is: $ARGUMENTS

Follow all conventions in ADDING_AN_AGENT.md exactly.
