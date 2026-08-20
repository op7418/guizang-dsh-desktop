# Agent Note: Profile-scoped provider onboarding without an official notice

Status: implemented

English | [中文](2026-08-18-profile-scoped-provider-onboarding.zh.md)

## Problem

The upstream GUI first-run path combined an official internal-testing notice with a DeepSeek-specific credential dialog. Pilot Harness must not present that official notice, and a client that supports several provider families cannot privilege one vendor before the user has chosen a route. The replacement provider prompt was initially dismissed through one origin-wide `localStorage` key, so skipping it in one Harness settings profile also suppressed it in every other profile served from that origin.

## Decision

`ui-settings-models` owns one vendor-neutral onboarding entry backed by the same joined provider and credential snapshot as the Providers page. It appears only when no configured provider is usable, waits for discovery and any existing dialog to settle, and offers two explicit actions: open the Providers section or skip. Either action closes the prompt immediately. The prompt describes a missing model provider; it does not claim that provider usability proves a non-empty remote model catalog.

The Host half of the same plugin registers the `pilot-provider-onboarding` settings namespace with one optional `dismissed` boolean. The client binds that namespace through `SettingsScope`; opening Providers or skipping writes `dismissed: true` into the current Harness settings profile. Multiple mounted prompt surfaces observe the same scope, while another profile retains its own first-run state. Read-only or failed settings/provider joins never block browsing.

The upstream internal-test notice, its version store, and the DeepSeek-only onboarding component remain absent. This decision supersedes the active presentation and acknowledgement mechanism in [Shared-modal product onboarding](2026-08-13-shared-modal-product-onboarding.md) and the restored-welcome parts of [Versioned GUI welcome onboarding](2026-07-30-versioned-gui-welcome-onboarding.md). The original full-viewport notice and telemetry copy remain removed under [Remove the first-run beta notice](../simplification/2026-08-13-remove-first-run-beta-notice.md).

## Upstream ownership boundary

This product behavior intentionally replaces upstream source inside `packages/client/ui-settings-models` rather than layering a second simultaneous onboarding entry over it. The removed welcome, DeepSeek prompt, stores, copy, and their browser/unit tests are therefore an explicit Pilot fork boundary. Upstream changes to `settings.onboarding`, `ui-settings-models`, or `ui-settings-general` require semantic review even when Git reports a clean merge; the [upstream and release gates](../process/2026-08-19-pilot-upstream-and-desktop-release-gates.md) own the automated verification around that boundary.

## Alternatives considered

**Keep the official notice before the Pilot provider prompt.** Rejected because the upstream internal-test statement describes another product's release posture and creates mandatory friction before a user can inspect the client.

**Keep a DeepSeek-specific API-key editor in onboarding.** Rejected because provider management already supports several route families, and the first-run prompt only needs to direct the user to that complete surface.

**Persist dismissal in browser `localStorage`.** Rejected because the origin is not the settings identity. Profiles sharing a server origin or desktop renderer must not share onboarding acknowledgement.

**Require at least one model-catalog row before completing onboarding.** Rejected because catalog listing is advisory and may fail transiently while an explicitly configured provider/model route remains usable. The prompt and README state the narrower provider-readiness rule.

## Consequences

Pilot Harness opens without an official internal-test notice and remains explorable without provider configuration. A skip survives reloads and app restarts for exactly one settings profile, and provider setup remains available later. The plugin now has a Host-side settings dependency instead of being presentation-only. The deliberate source replacement increases merge attention around upstream onboarding, but its behavior is covered by Host registration, React scope-sharing, readiness, and assembled GUI tests rather than by an unscoped browser key.
