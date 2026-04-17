# Splitwise Clone

A Splitwise replica built autonomously by Claude Code.

**Stack**: Node.js 20 · Express · React 18 · PostgreSQL 15 · Drizzle ORM · TypeScript

## Local Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/tally.git
cd splitwise-clone
npm install
```

### 2. Start local databases
```bash
docker-compose up -d
```

### 3. Set environment variables
```bash
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your values
```

### 4. Run migrations
```bash
npm run db:migrate
```

### 5. Start dev servers
```bash
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

---

## GitHub Setup (one-time)

### 1. Install Claude Code GitHub App
```bash
claude
/install-github-app
```
Follow the prompts. You need to be a repo admin.

### 2. Add repository secret
In GitHub → Settings → Secrets → Actions, add:
- `ANTHROPIC_API_KEY` — your Anthropic API key

### 3. Create a `claude-bot` GitHub user (optional)
Or use your own account — just assign issues to whoever triggers the workflow.

---

## Autonomous Workflow

### How to start a new feature

1. **Open the seed issue** from `.github/ISSUE_SEED.md`
   - Copy the content into a new GitHub Issue
   - Assign it to `claude-bot`

2. **Claude breaks it into tasks** and posts a comment with the task list + label `awaiting-approval`

3. **You review and approve**: reply `@claude approved, proceed`

4. **Claude writes design docs** for each task and opens draft PRs labeled `awaiting-approval`

5. **You review each design**: reply `@claude approved, proceed` on the design PR

6. **Claude implements**: writes tests first, then code, runs lint + tests, opens a real PR

7. **Automatic review**: `claude-pr-review.yml` triggers, Claude reviews its own PR and either:
   - ✅ Approves it (you just need to click merge)
   - 🔧 Requests changes from itself and pushes fixes

8. **You merge** when ready.

---

## Project Conventions
See [CLAUDE.md](./CLAUDE.md) for the full spec Claude follows.

## Design Docs
All design docs live in `docs/designs/` — one per task, approved before implementation.
