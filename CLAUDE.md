# Vending machine

Take-home task for Modo Energy. A Next.js vending machine with an API and a customer UI.

## Agent skills

### Issue tracker

The tracker is Notion, not GitHub.

- Spec: [Spec: Vending Machine](https://app.notion.com/p/3fd601aba8e4815ebd04da534f2401d5)
- Tickets: the [Tickets database](https://app.notion.com/p/8f41a54a254f497097c5ec2d1d33f5f6), data source `collection://be861899-1c09-41d0-ab5e-de7bbfaf1b14`. Each ticket has Name ("01: …"), Status, Order, Label, Blocked by and Blocks.
- Use the claude.ai Notion connector (tool names start with `mcp__e5c40612-0a29-4008-8646-d2e64e156438__notion-`). The engineering plugin connector (`mcp__plugin_engineering_notion__*`) returns 404 for these pages.
- A ticket can start when every ticket in "Blocked by" has Status "Done".
- To start a ticket, set Status to "In progress".
- To close a ticket, tick its acceptance criteria and set Status to "Done".
- The triage label is `ready-for-agent`, in the Label property.

### Domain docs

There is no `GLOSSARY.md` and there are no ADRs. The spec defines the terms: change supply, cash box, float, purchase, and the refusal codes.

## Rules

- All money is integer pence. Only the UI shows £ values.
- The test seam is `purchase(request, now)` on the vending machine module.
- Nobody commits to the `two-hour-mark` branch after it exists.
- The prototype is on the `prototype/visual-direction` branch. Use variant C.
