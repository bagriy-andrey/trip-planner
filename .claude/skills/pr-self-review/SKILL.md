---
name: pr-self-review
description: "Pre-PR gate: analyses git diff, routes changed files through architecture and quality skills by file type, blocks on CRITICAL findings. Run manually with /pr-self-review or auto-triggered before GitHub PR creation."
allowed-tools: Read, Bash, Glob
user-invocable: true
---

# PR Self-Review

Local gate that runs before opening a PR. Inspects `git diff main...HEAD`, routes each changed file to the relevant skills, then returns **BLOCKED** or **PASS**.

This skill is also invoked automatically by a `PreToolUse` hook before `mcp__github__create_pull_request`. If the result is BLOCKED, do NOT proceed with PR creation — report findings and stop.

---

## Step 1 — Collect the diff

```bash
git diff main...HEAD --name-only   # changed files
git diff main...HEAD               # full diff for content analysis
```

If the current branch IS `main`, fall back to `git diff HEAD`.

---

## Step 2 — Classify files into buckets

Each changed file belongs to one or more buckets. Evaluate path patterns in order:

| Bucket | Path patterns |
|--------|--------------|
| `mobile-screens` | `mobile/app/**/*.tsx` (expo-router screens/layouts) |
| `mobile-components` | `mobile/src/**/*.tsx` (not tests) |
| `mobile-tests` | `mobile/**/*.test.*`, `mobile/**/*.spec.*` |
| `mobile-config` | `mobile/app.config.*`, `mobile/eas.json`, `mobile/package.json` (release-relevant) |
| `mobile-other` | `mobile/**/*.ts` (not test, not config) |
| `server-routes` | `server/src/**/*route*.ts`, `server/src/**/*plugin*.ts` |
| `server-db` | `server/src/db/**/*.ts` |
| `server-other` | `server/src/**/*.ts` (not db, not routes) |
| `shared` | `shared/**/*.ts` |
| `e2e-flows` | `e2e/**` (Maestro YAML, scripts) |
| `zod-schemas` | any file whose diff contains `z.object(` or `z.string(` |
| `all` | every changed file (security cross-cut, always runs) |

---

## Step 3 — Baseline checks (run before skills)

For each package (`mobile/`, `server/`, `shared/`) that contains at least one changed file:

```bash
cd <package-dir> && pnpm typecheck 2>&1
```

- Each TypeScript error → `CRITICAL` finding (category: `typecheck`, file + line from error output)
- A failing typecheck does **not** stop the remaining steps — continue and collect all findings

---

## Step 4 — Route skills by bucket

Apply each skill **only if its bucket has ≥ 1 file**. Analyse the diff content, not the whole file (read surrounding context only when needed to judge a finding).

| Bucket | Skills |
|--------|--------|
| `mobile-screens` | `mobile-architecture`, `expo-react-native`, `react-best-practices` |
| `mobile-components` | `mobile-architecture`, `expo-react-native`, `react-best-practices` |
| `mobile-tests` | `react-native-testing` |
| `mobile-config` | `mobile-release` (permissions strings, privacy manifest, versioning, EAS profiles, secrets in `EXPO_PUBLIC_*`) |
| `mobile-other` | `mobile-architecture`, `typescript-expert` |
| `server-routes` | `fastify-best-practices`, `onion-architecture`, `security` |
| `server-db` | `drizzle-orm-patterns`, `postgresql-table-design` |
| `server-other` | `onion-architecture`, `typescript-expert` |
| `shared` | `zod`, `typescript-expert` |
| `e2e-flows` | `react-native-testing` |
| `zod-schemas` | `zod` |
| `all` | `security` (scan every file for secret patterns and injection sinks) |

---

## Step 5 — Severity classification

Every finding must have one of three severities:

| Severity | Criteria | Effect on PR |
|----------|----------|--------------|
| `CRITICAL` | Exploitable security issue; architecture constraint violated (dependency inversion, DB imported directly in route); typecheck error | **Blocks PR** |
| `WARNING` | Best-practice deviation, non-idiomatic pattern, missing test coverage for changed logic | Shown, does not block |
| `INFO` | Optional improvement, stylistic note | Shown, does not block |

**Confidence rule** (inherited from `security` skill): only report what you can confirm with HIGH confidence. Trace the data flow before flagging. Do not promote a theoretical issue to CRITICAL.

---

## Step 6 — Render the report

### When BLOCKED

```
## PR Self-Review — <branch> → main

### ❌ BLOCKED — <N> critical issue(s) must be fixed before opening the PR

#### [CRITICAL] <category> — <file>:<line>
What: <one sentence describing the violation>
Fix:  <specific, actionable instruction>

---
### ⚠️ Warnings (<N>)

#### [WARNING] <category> — <file>:<line>
What: <one sentence>
Suggestion: <specific action>

---
### Summary

| Package       | Files reviewed | Critical | Warning | Info |
|---------------|----------------|----------|---------|------|
| mobile/       | 2              | 0        | 1       | 0    |
| server/       | 3              | 2        | 0       | 1    |

**Decision: ❌ BLOCKED** — do not open the PR until all CRITICAL issues above are resolved.
Re-run `/pr-self-review` after fixing.
```

### When PASS

```
## PR Self-Review — <branch> → main

### ✅ PASS — safe to open the PR

[If warnings exist, render the ⚠️ Warnings section. Otherwise omit.]

| Package       | Files reviewed | Critical | Warning | Info |
|---------------|----------------|----------|---------|------|
| mobile/       | 2              | 0        | 0       | 1    |

**Decision: ✅ PASS**
```

---

## Step 7 — Gate enforcement

- **BLOCKED**: stop here. Do NOT create the PR. Tell the user to fix the listed CRITICALs and re-run the skill.
- **PASS / PASS with warnings**: the skill is done. If invoked from the PreToolUse hook, allow the PR creation to proceed.
