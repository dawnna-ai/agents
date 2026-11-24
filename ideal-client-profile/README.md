# Ideal Client Persona

The seventh reusable agent in Selling Certainty's standard client distribution.

**One installation, any number of client-specific profiles.** This package contains no buyer records, credentials, base IDs or preselected industries. The active project's approved `Ideal Client Profiles` table provides all named profiles. It works for professional services, trades, home services and other businesses.

## Set up for a client

1. Install `ideal-client-profile` alongside Quinn, Clyde, PJ, Emma, Sofia and Lena from the shared package for the chosen platform.
2. In the client's **Business Airtable base**, maintain one **Ideal Client Profiles** record per distinct persona. Name each clearly, e.g. `Remodel Homeowner` vs `Repair Homeowner` or `Trade Referral Partner — Tile Contractor`. Multiple records are supported; don't impose a fixed list.
3. In that client's **Client Project Brief / Project Instructions**, specify their Business base ID, Ideal Client Profiles table ID/name, what counts as an **approved** profile, and authorize **read-only** access using that client's connected Airtable account. Never include their credentials or private records in a public GitHub repository.
4. Confirm the Airtable connector is accessible on **each platform separately**. Merely installing a plugin does not grant Airtable access or synchronize credentials across ChatGPT and Claude.
5. Test: “Ideal Client Persona, which approved buyer profiles are available?” Then “Speak as [exact profile name] and react to this.” Confirm that the persona doesn't reveal the business's internal plans.

## Using multiple profiles

With more than one approved record, the agent prompts for a choice unless the client names it. “Switch to [name]” changes persona. Adding a new approved Airtable record makes it eligible for the next lookup; there is no per-persona plugin installation.

## If Airtable is unavailable

Provide an explicitly approved, client-specific snapshot of the profile in the **active private client project**. The agent must say it is using a snapshot rather than live Airtable. Do not package such snapshots in this public repository.

## Counselor

Counselor remains the named Selling Certainty employment-law buyer profile. The existing private Counselor plugin is a separate, hardcoded implementation and **is not** a substitute for this cross-platform seventh agent. This package does not copy or disclose Counselor's private profile.
