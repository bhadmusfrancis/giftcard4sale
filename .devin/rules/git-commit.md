---
description: "Commit" means commit and push to GitHub so Vercel/Render deploy.
trigger: always_on
---

# Git Commit = Commit + Push

In this project, when the user asks to **commit** (or "commit to git"), treat it as a full publish workflow — not a local-only commit.

## Required workflow

1. Run `git status`, `git diff`, and `git log` to understand changes.
2. Stage only relevant source files (never `.env`, credentials, or build artifacts like `*.tsbuildinfo` unless explicitly requested).
3. Create the commit with a clear message.
4. **Push to GitHub** so deployments pick it up:
   - `git push origin HEAD` (or `git push -u origin <branch>` if the branch has no upstream)
5. Confirm with `git status` that the branch is up to date with `origin`.

## Why

- **Vercel** deploys the web app from GitHub.
- **Render** deploys the API from GitHub.
- A local-only commit will not appear in production.

## Do not

- Stop after `git commit` when the user said "commit".
- Force-push to `main`/`master` unless the user explicitly requests it.
- Push secrets or `.env` files.

## If push fails

Report the error and next steps (auth, branch protection, conflicts) — do not claim the commit is done for deployment purposes until the push succeeds.
