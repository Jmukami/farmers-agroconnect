# Internal Git and GitHub Collaboration Guide

This guide explains the standard way to work on the project using Git and GitHub.

The most important rule is:

> **Never work directly on `main`. When in doubt, stop and ask a teammate before changing shared code or running a command you do not understand.**

---

## 1. Basic terminology

- **Repository:** The project folder tracked by Git.
- **Git:** The tool that records changes to files.
- **GitHub:** The online service where the repository and pull requests are hosted.
- **Branch:** A separate version of the project where you can work safely.
- **Commit:** A saved checkpoint containing a set of changes.
- **Pull request (PR):** A request for teammates to review your branch and merge it into `main`.
- **`main`:** The shared, stable branch. It should contain reviewed code.
- **Origin:** The name Git gives to the shared GitHub repository.

The usual workflow is:

```text
Update main
   ↓
Create a branch
   ↓
Make and test changes
   ↓
Commit changes
   ↓
Push branch to GitHub
   ↓
Open a pull request
   ↓
Get review
   ↓
Merge into main
```

---

## 2. Before starting work

Open a terminal in the project folder. Check which branch you are on and whether you have uncommitted changes:

```bash
git status
```

If you have unfinished changes, do not switch branches or pull until you understand what they are. Ask a teammate if necessary.

Update your local copy of `main`:

```bash
git checkout main
git pull origin main
```

Create a new branch for your task:

```bash
git checkout -b feature/farmer-search-filter
```

Use one branch per task. Common branch prefixes are:

```text
feature/short-description   New functionality
fix/short-description       Bug fix
docs/short-description      Documentation change
refactor/short-description  Code restructuring without changing behavior
```

Examples:

```bash
git checkout -b feature/farmer-search-filter
git checkout -b fix/phone-number-validation
git checkout -b docs/update-api-guide
```

Use short, lowercase descriptions with hyphens. Do not work directly on `main`.

Confirm that you are now on your new branch:

```bash
git branch --show-current
```

---

## 3. Keep your work focused

Each branch and pull request should solve one clear problem.

For example, a branch that adds a search filter should not also:

- Reformat unrelated files
- Rename unrelated functions
- Update generated files unnecessarily
- Fix unrelated bugs
- Include temporary debugging code

Keeping changes focused makes them easier to test, review, and undo.

---

## 4. Make and save changes

Work normally, then check what has changed:

```bash
git status
```

View changes that have not yet been staged:

```bash
git diff
```

A good commit is:

- Small enough to understand
- Related to one task
- Tested or checked
- A complete, meaningful step

Avoid waiting until the end of the day to create one very large commit. Make commits as you complete sensible pieces of work.

### Stage only the files you intend to commit

Prefer naming files explicitly:

```bash
git add path/to/file.js
git add path/to/another-file.js
```

Avoid using this unless you have carefully reviewed every change:

```bash
git add .
```

After staging files, review exactly what will be committed:

```bash
git diff --staged
```

If the staged changes are correct, create a commit:

```bash
git commit -m "fix: validate farmer phone number"
```

### Commit message format

Use a short, clear, imperative message:

```text
type: description
```

Examples:

```text
feat: add category filter to produce market
fix: prevent ordering self-owned listings
docs: update REST API specification
refactor: extract currency formatting into formatKsh
test: add validation tests for phone numbers
chore: update project dependencies
```

The message should describe what the commit does, not what you were doing.

Good:

```text
fix: reject invalid farmer phone numbers
```

Less useful:

```text
worked on phone stuff
```

---

## 5. Never commit secrets or private information

Before committing, make sure you have not included:

- Passwords
- API keys
- Access tokens
- Private certificates
- `.env` files containing secrets
- Customer or user data
- Database exports
- Personal configuration files
- Debug logs containing sensitive information

If you accidentally commit a secret:

1. Stop using the secret immediately.
2. Tell a teammate.
3. Revoke or rotate the secret.
4. Do not assume that deleting it in a later commit removes it from Git history.

---

## 6. Keep your branch up to date

Other team members may merge changes into `main` while you are working. Before opening a pull request, update your branch.

First, make sure your own work is committed:

```bash
git status
```

If Git says you have uncommitted changes, commit them before continuing.

Download the latest information from GitHub:

```bash
git fetch origin
```

Reapply your branch's commits on top of the latest `main`:

```bash
git rebase origin/main
```

This keeps the project history tidy. Do not rebase a branch that other people are actively using unless the team has agreed to it.

If your team uses merge commits instead of rebasing, follow the team's approved workflow. Do not use a different workflow without asking.

---

## 7. Resolving conflicts

A conflict happens when Git cannot automatically combine your changes with someone else's changes.

Do not panic, and do not automatically choose “Accept All.”

First, see which files need attention:

```bash
git status
```

Open each conflicted file. Git will show sections like this:

```text
<<<<<<< HEAD
Changes from the branch you are applying onto
=======
Your changes
>>>>>>> commit-id
```

Decide what the final code should be. You may need to:

- Keep the first version
- Keep the second version
- Combine both versions
- Rewrite the section

Remove all of these markers:

```text
<<<<<<<
=======
>>>>>>>
```

Then review the resolved file:

```bash
git diff
```

Run the relevant tests, lint commands, or build commands. If the file is correct, stage it:

```bash
git add path/to/resolved-file
```

### If the conflict occurred during a rebase

Continue the rebase:

```bash
git rebase --continue
```

Git may ask you to confirm or edit a commit message.

To cancel the entire rebase and return to the state before it started:

```bash
git rebase --abort
```

### If the conflict occurred during a merge

To cancel the merge:

```bash
git merge --abort
```

If you are unsure which version is correct, stop and ask a teammate. Do not guess.

---

## 8. Run checks before pushing

Run the commands documented by the project. For this project, the usual commands are:

```bash
npm run lint
npm run build
```

If the project has tests, run those too. The command may be documented in the README or `package.json`, for example:

```bash
npm test
```

Fix errors before opening or updating a pull request. Do not ignore warnings or failures without discussing them with a teammate.

---

## 9. Push your branch to GitHub

Push your branch for the first time with:

```bash
git push -u origin feature/farmer-search-filter
```

After the first push, you can usually use:

```bash
git push
```

Push only your own task branch. Do not push directly to `main`.

Avoid force-pushing:

```bash
git push --force
```

Force-pushing can remove other people's commits. Only use it if the team explicitly approves it. If force-pushing is necessary, use the safer form:

```bash
git push --force-with-lease
```

---

## 10. Open a pull request

On GitHub, open a pull request from your branch into `main`.

Before submitting it, check that:

- The pull request targets the correct base branch, usually `main`
- The title clearly describes the change
- The description explains:
  - What changed
  - Why it changed
  - How it was tested
  - Any setup, database, configuration, or migration steps
- Screenshots or request/response examples are included when useful
- Only related changes are included

A useful pull request description might look like this:

```text
## What changed

Added a category filter to the produce market search.

## Why

Users could not narrow search results by produce category.

## How it was tested

- Ran npm run lint
- Ran npm run build
- Tested filtering manually in the browser

## Additional setup

No additional setup is required.
```

Keep pull requests small enough for someone else to review properly.

---

## 11. Responding to pull request feedback

Reviewers may request changes. Make those changes on the same branch:

```bash
git status
# edit the files
git add path/to/file
git commit -m "fix: address review feedback"
git push
```

The pull request updates automatically when you push new commits to its branch.

Do not approve your own pull request. Wait for the required reviewers to approve it.

Do not merge while required checks are failing. If a check is confusing, appears unrelated, or cannot be fixed, ask a teammate.

---

## 12. Before merging

The author and reviewers should confirm:

- The pull request targets the correct branch.
- The change solves the intended task.
- All intended files are included.
- Unrelated files and changes are absent.
- Secrets, private information, and temporary files are absent.
- Debugging code and unnecessary console output are removed.
- Linting passes.
- Tests pass.
- The project builds successfully.
- Any required setup or migration instructions are documented.
- The required reviewers have approved the pull request.

Once the required review and checks are complete, merge the pull request using the team's approved GitHub merge option.

After the pull request is merged, delete the remote branch through GitHub if the team does so. You can then update your local `main`:

```bash
git checkout main
git pull origin main
```

---

## 13. Useful Git commands

```bash
git status
```

Shows your current branch and whether you have uncommitted changes.

```bash
git branch --show-current
```

Shows the branch you are currently using.

```bash
git branch
```

Lists local branches. The current branch is marked with `*`.

```bash
git diff
```

Shows changes that have not been staged.

```bash
git diff --staged
```

Shows changes that are staged and will be included in the next commit.

```bash
git log --oneline -5
```

Shows the five most recent commits.

```bash
git fetch origin
```

Downloads information about new changes from GitHub without changing your files.

```bash
git pull origin main
```

Downloads and applies the latest changes from the remote `main` branch.

```bash
git restore path/to/file
```

Discards unstaged changes in a file.

**Warning:** This can permanently delete work.

```bash
git restore --staged path/to/file
```

Removes a file from the staging area without deleting your changes.

```bash
git stash
```

Temporarily stores uncommitted changes. Use this only when necessary and remember that stashed work still needs to be recovered later.

---

## 14. A safe everyday workflow

Use this sequence for most tasks:

```bash
# 1. Go to the project
cd path/to/project

# 2. Check your current state
git status

# 3. Update main
git checkout main
git pull origin main

# 4. Create a branch
git checkout -b feature/short-description

# 5. Make your changes
# Edit files here

# 6. Review your changes
git status
git diff

# 7. Stage only intended files
git add path/to/file

# 8. Review staged changes
git diff --staged

# 9. Commit
git commit -m "feat: describe the change"

# 10. Run project checks
npm run lint
npm run build

# 11. Update your branch before the pull request
git fetch origin
git rebase origin/main

# 12. Push to GitHub
git push -u origin feature/short-description
```

Then open a pull request on GitHub and wait for review.

---

## 15. When to stop and ask for help

Stop and ask a teammate if:

- You are about to change `main`.
- You do not understand what `git status` is showing.
- You see a conflict and are unsure which code is correct.
- You may have committed a password, token, or private data.
- Git asks you to resolve something you do not understand.
- A rebase or merge behaves unexpectedly.
- A required check fails and you cannot determine why.
- You think you need to force-push.
- You are unsure whether a change belongs in your task.

When asking for help, include the command you ran and the output of:

```bash
git status
```

Do not delete files or run additional recovery commands until someone has reviewed the situation.