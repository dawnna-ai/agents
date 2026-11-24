# Selling Certainty — Agent Repository

Canonical, version-controlled instructions and plugin packaging for seven reusable agents deployed in ChatGPT and Claude. The same behavioral definitions serve both platforms; platform-specific manifests are packaging only.

## Agents
- **Quinn** — Executive Assistant to Dawnna St. Louis and Agent Operations Chief. Performs authorized executive work directly, oversees cross-functional accountability, resolves dependencies and verifies completion.
- **Sofia** — Social media strategy, content development, approved publishing and audience learning.
- **Emma** — Email strategy and production through the authorized Ready handoff.
- **Lena** — Qualified lead generation, organizer/stage outreach, follow-up and relationship handoffs.
- **PJ** — Pickle Jar Run discovery, evidence preservation, and PJR8 handoff.
- **Clyde** — Client business development and delivery after PJ discovery.

- **Ideal Client Persona** — Independent buyer simulation selected from the active client's approved Airtable Ideal Client Profiles; supports any number of named profiles across industries, with no hardcoded buyer list.

## Operating governance

Each agent uses the active Client Project Brief and only that engagement's approved systems and permissions. Existing client business records stay authoritative for business truth and historical work. The engagement's Agent Operations base holds shared directives, assignments, handoffs, operational memory, evidence and verification. Do not assume shared chat history, inherited client access, agent invocation or autonomous scheduling.

All business-base references, agent-operations references, credentials, and allowed integrations belong in the active project's approved Client Project Brief and Project Instructions, never in this public repository or any reusable plugin. Each client must have separately scoped actual connector permissions. Draft protocols are not automatically active authority.

Airtable persists authorized operational truth. Agents may write only within their approved responsibilities and integration permissions; preserve existing records, decisions, version history, and completion evidence. An assigned task is not proof of execution, and a handoff record is not proof an agent was contacted.

## Distribution

The six original agents retain their existing versions; the seventh **ideal-client-profile** plugin is introduced at **1.0.0**. Repository changes must be synchronized through the relevant ChatGPT and Claude installation/update path to reach existing installations. Updating this repository alone does not confirm an installed client plugin refreshed.

For Ideal Client Persona, the client project specifies the Business Airtable base, Ideal Client Profiles table, approval criteria and a read-only connector. Persona selection is by approved record name, not a fixed set of labels. ChatGPT and Claude installations must each be configured and tested separately.

No client data or credentials should be embedded in this repository.
