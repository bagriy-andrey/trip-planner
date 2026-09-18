---
name: task-board
description: "Capture and manage tasks/ideas on the project's GitHub Projects board (issues + board columns) via the gh CLI. Use when the user says things like 'запиши задачу', 'добавь в бэклог', 'note this idea', 'add a task', 'what's on the board', 'что в бэклоге', 'move X to Ready', or asks to turn a board item into a spec. Trigger terms: task, backlog, board, issue, idea, todo, запиши, задача, бэклог."
allowed-tools: Bash, Read
user-invocable: true
---

# Task board (GitHub Projects)

Repo: `bagriy-andrey/trip-planner`. Board: the user-level GitHub Project **TripPlanner**
(owner `bagriy-andrey`, number **1**, node id `PVT_kwHOAZl5os4Bj8NO`,
https://github.com/users/bagriy-andrey/projects/1), linked to the repo. Status field id
`PVTSSF_lAHOAZl5os4Bj8NOzhiutO0`; options: `Backlog → Design → Ready → In progress → Done`.
(If a `gh project` call says an id doesn't exist, re-read ids with `gh project field-list 1 --owner bagriy-andrey --format json`.)

Always target github.com explicitly (the machine also has a github.ibm.com login):
pass `--repo bagriy-andrey/trip-planner` to `gh issue`, `--owner bagriy-andrey` to `gh project`.

## Preconditions
`gh auth status` must show scope `project` for github.com. If missing, tell the user to
run `! gh auth refresh -h github.com -s project` (interactive) — don't try to work around it.
If project 1 is missing, say so — don't create a second one.

## Add a task (default action for "запиши задачу: …")
1. Draft a short title (≤70 chars) + body using the issue template fields
   (What / Why / Platforms / Area / Done when). Don't invent details the user didn't give;
   leave optional fields out.
2. Labels: one or more of `idea, design, mobile, backend, shared, web, e2e, release`, plus
   `ios-only` if the behavior is iOS-only. Default `idea` when unsure.
3. `gh issue create --repo bagriy-andrey/trip-planner --title … --body … --label …`
4. Add to the board AND set status explicitly (new items get NO status by default):
   ```
   ITEM=$(gh project item-add 1 --owner bagriy-andrey --url <issue-url> --format json | jq -r .id)
   OPT=$(gh project field-list 1 --owner bagriy-andrey --format json | jq -r '.fields[]|select(.name=="Status")|.options[]|select(.name=="Backlog")|.id')
   gh project item-edit --id "$ITEM" --project-id PVT_kwHOAZl5os4Bj8NO --field-id PVTSSF_lAHOAZl5os4Bj8NOzhiutO0 --single-select-option-id "$OPT"
   ```
5. Reply with the issue URL and a one-line summary. Don't ask for confirmation for a
   plain capture — it's cheap and editable; do ask if the request is ambiguous
   (several tasks in one message → create one issue each and list them).

## View the board
`gh project item-list 1 --owner bagriy-andrey --format json` (status is `.items[].status`, title `.items[].title`) → summarize per column,
newest first, with issue numbers.

## Move / update
- Status change: same `item-edit` as in "Add a task" with the target option name
  (find the item id via `item-list`).
- Close/comment: `gh issue close|comment <n> --repo bagriy-andrey/trip-planner`.

## Board item → SDD pipeline
When the user moves an item to **Ready**, offer to run `spec-creator` with the issue body as
input. The resulting `SPEC-NN-*.md` links back with `Issue: #<n>`; PRs reference it with
`Closes #<n>` so the item moves to Done on merge.

## Rules
- Never delete issues or the project; closing is enough.
- Never put secrets or credentials in issue text.
- Issues are public if the repo is public — no private info.
