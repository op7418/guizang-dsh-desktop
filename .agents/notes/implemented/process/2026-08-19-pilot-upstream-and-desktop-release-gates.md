# Agent Note: Gate Pilot upstream sync and desktop releases on installable artifacts

Status: implemented

English | [中文](2026-08-19-pilot-upstream-and-desktop-release-gates.zh.md)

## Problem

Pilot Harness tracks a fast-moving upstream release line and publishes three native desktop packages from GitHub Actions. The default branch is `main`, but the inherited primary CI workflow watched only `master`; the upstream workflow verified a source-mode desktop subset before pushing directly to `main`; and the release workflow could publish without the complete source checks or launching what it had packaged. Release selection also trusted creation order and a movable tag, while macOS recursively signed helpers without applying their required inherited entitlements. These gaps allowed a clean source-mode test to coexist with an unverified or unusable release artifact.

## Decision

The primary CI workflow runs the complete hosted Linux aggregate and static CodePilot UI audit on every `main` push. The scheduled upstream workflow runs only from `main`, reads the configured upstream repository, resolves GitHub's latest non-draft/non-prerelease release through strict DSH-tag SemVer, rejects a downgrade, and refuses a recorded tag whose commit moved. A clean merge runs `check:ci:linux-primary`, the desktop build, desktop tests, desktop typecheck, and the same static UI audit before a fast-forward push. Version metadata lands in a separate commit rather than amending an unrelated Pilot commit. Conflict and missing-signing issues use exact titles and close when their condition clears.

Pilot-only fixes use the manual `Release Pilot Harness changes` workflow on `main`. It requires the current tracked release to exist, selects one revision above every released `pilot.N` for that upstream version, runs the same complete source checks, commits the two version fields, and then dispatches the native release. Release discovery consumes the raw paginated GitHub API response rather than combining the CLI's mutually exclusive `--slurp` and `--jq` modes. It shares a non-cancelling concurrency group with upstream sync, so the two writers cannot race.

Every release has its own complete Linux source-quality job in the desktop workflow, in addition to the native matrix and plugin-bundle installation check. Each native runner launches the packaged application with an isolated Harness home and requires the bundled DSH runtime to load far enough to capture a real renderer screenshot. The publish job depends on every native leg, plugin bundles, and the source-quality job. A tested release-assets resolver requires exactly one expected output per platform before assigning stable download names. An upstream version containing a prerelease segment remains a GitHub prerelease and never becomes `latest`.

macOS signs nested helper applications individually with the inherit entitlements and then signs the outer application, while the initial recursive signature is only a bootstrap for nested code outside those helper bundles. Verification requires Developer ID identity when configured, the expected team, hardened-runtime flags, strict deep signature validity, and the JIT/inherit entitlements on every helper. GitHub-hosted packaging remains the only release path; the mutable third-party setup and release actions used by these workflows are pinned to reviewed commits.

## Maintainer boundary

The upstream merge is intentionally not a file-copy overlay. Pilot's provider-neutral onboarding replaces upstream's internal-test welcome and vendor-specific credential files inside `ui-settings-models`, so that package is an expected merge-review hotspot. A conflict stops before `main`; a conflict-free merge still has to satisfy the complete source and packaged-artifact checks. The absence of a textual conflict is never treated as compatibility evidence on its own.

## Alternatives considered

**Open a pull request for every scheduled upstream release.** Rejected for the automated path because the complete source aggregate runs before the push and again for a release, while merge conflicts still stop for human resolution. A pull request remains available when a conflict or intentional product-boundary change needs review.

**Treat the source-mode Electron E2E as the release smoke.** Rejected because it resolves the unpackaged CLI path and cannot prove the packaged dependency closure, native output layout, or signed helper behavior.

**Keep `codesign --deep` as the only signing operation.** Rejected because the outer entitlements do not propagate to Electron helpers. Explicit inner-to-outer signing makes the helper entitlements observable and independently verifiable.

**Publish a release after the upstream workflow's desktop-only checks.** Rejected because provider onboarding, documentation pairing, UI tokens, replay behavior, and other inherited packages can regress without changing the desktop shell tests.

## Consequences

An upstream release cannot reach `main` or GitHub Releases through the automated path without the repository's complete Linux checks, the static UI audit, and a successful packaged launch on each native runner. A Pilot-only fix can receive a new version without waiting for upstream, but that revision step is an explicit manual release action. Release failures leave verified source on `main` and can be retried without rewriting history. The cost is duplicated source-quality work between sync and release, longer native jobs, and continued manual attention when upstream touches Pilot's intentional onboarding fork. The packaged smoke proves startup and bundled runtime resolution; it does not install NSIS, DEB, or RPM through an operating-system package manager, and notarization remains separate from Developer ID signing.
