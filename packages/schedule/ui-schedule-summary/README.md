# @deepseek-ai/dsh-ui-schedule-summary

English | [中文](README.zh.md)

This dual-face plugin contributes active reminder metadata to the Workspace Session hover summary without changing the Schedule domain. Its Host half registers the loopback-authorized `/pilot-schedule-summary` Connection RPC channel. The handler calls `ctx.sessionPersistence.inspect`, folds the upstream `schedule/change` stream through `foldScheduleEvents(events, meta.seedLength ?? 0)`, and returns only the active count and nearest `scheduledAt`. Inspection does not resume a cold Session, and the seed boundary prevents a fork from displaying reminders owned by its parent. Results are cached for 15 seconds with in-flight request coalescing and are invalidated by matching Schedule changes. Expired entries are pruned on reads, and the least recently used entries are evicted above 256 Sessions, so repeated hover mounts do not repeatedly scan the full log or grow memory without a bound.

The browser half registers one ordered entry in `sidebar.workspaces.session.detail`. It requests the summary only while the delayed hover card is mounted, omits the row for zero active reminders or failures, and renders with the Workspace owner's serializable class and icon-name facts. The package therefore introduces no independent card style, color, radius, or icon system.

The Pilot Harness desktop profile composes the upstream `@deepseek-ai/dsh-time-context` and `@deepseek-ai/dsh-schedule` rows plus this presentation row. Install the same prebuilt bundle in a local DeepSeek Harness Web profile with:

```sh
dsh plugin --profile web add https://github.com/op7418/pilot-harness/releases/latest/download/deepseek-ai-dsh-ui-schedule-summary-0.1.0-rc.5.tgz
```

Restart the Web profile, then confirm `pilot-schedule-summary` with `dsh --profile web --dump-config`. Remove it with `dsh plugin --profile web remove @deepseek-ai/dsh-ui-schedule-summary`. The browser must connect through loopback and expose `sidebar.workspaces.session.detail`; Pilot Harness v0.1.0 includes that contract, while older upstream releases cannot render the optional summary row.

The Schedule package remains the durable authority and model-facing tool owner. Disabling this plugin removes only the sidebar metadata; it neither deletes reminders nor disables Schedule itself.

## Model Experience

None, as this read-only presentation plugin adds no tools, prompt content, Session events, or follow-up behavior; `@deepseek-ai/dsh-schedule` independently owns the model-facing reminder tools and delivery lifecycle.

#### KV Cache effect

None; the plugin never assembles or sends a model request.

## Known Limitations and Deferred Work

- The hover summary shows only the active count and nearest target, not reminder prompts or management actions.
- A malformed or unavailable persisted log omits the optional row; the hover card does not surface a Schedule diagnostic.
- The RPC channel deliberately uses the strict loopback authority with no trusted-host exceptions because it exposes persisted Session metadata. Adding a LAN origin to the Harness `trustedHosts` setting does not enable it; remote Web clients require a separate authenticated transport that this plugin does not provide.
- An upstream Harness release without `sidebar.workspaces.session.detail` can load the package but cannot display its browser metadata row; Pilot Harness currently supplies that slot contract.
