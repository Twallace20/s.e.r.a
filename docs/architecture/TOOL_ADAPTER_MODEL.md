# Tool Adapter Model

Every tool adapter must follow the same rules:

1. Validate input.
2. Ask safety policy before acting.
3. Write safety events.
4. Execute bounded work.
5. Redact output.
6. Write tool events.
7. Return structured result.

No raw shell execution should live outside the tool package.

Starter tools:

- `FileTool`
- `ShellTool`

Future tools:

- `GitTool`
- `PackageTool`
- `TestTool`
- `BrowserTool`
- `KnowledgeSearchTool`
- `LLMProviderTool`
