# Beautiful UI adoption

Source reviewed: [Beautiful UI](https://www.beautifului.dev/) on 2026-08-16. The source primitives are published under the MIT License, copyright (c) 2026 Shane Levine. Pilot Harness does not import the demo application or its sample data; it implements the compatible interaction patterns against Harness's own slots, stores, localization, tokens, and HugeIcons semantic layer.

## Adopted mappings

| Beautiful UI primitive | Pilot Harness surface | Adaptation |
| --- | --- | --- |
| Prompt Bar | Conversation `InputBar` | Compact 14px card, square controls, stronger focus state, semantic send/stop icons |
| Thinking | `ReasoningRow` and Trajectory toolbar | Compact disclosure chip, shimmer, bordered expanded reasoning surface |
| Tool Chips | `ToolRow` | Filled 30px rows, monospace payload chip, compact expanded material |
| Context Cards | Composer context strip and `ContextMeter` | Persistent percentage chip and animated breakdown card |
| Search | `SearchBlock` | Semantic search/file/copy icons, card header, hoverable file groups |
| Code Block | Markdown `CodeBlock` | File/language header, semantic copy state, line numbers and row hover |
| Sidebar Nav | Worktree plugin | Compact 14px shell, 7px tree rows and quieter elevation |

## Deliberately retained

- Harness data ownership, projection stores, Cordis slots, accessibility and localization remain unchanged.
- CodePilot desktop window chrome, typography, provider branding, settings layout and cross-platform shell remain the product-level visual system.
- Beautiful UI's demo-only autoplay, sample providers, inline brand SVGs and `glimm` rainbow shader are not included.
