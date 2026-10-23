# Contributing to Table Tennis Academy (TTA)

Thank you for contributing to the TTA Portal! To maintain our production-readiness, security posture, and accessibility standards, all contributors must follow these guidelines.

---

## 1. Development Principles

1. **Security First**:
   - Never log passwords, tokens, OTPs, or session secrets. Use `logger` which automatically redacts sensitive keys.
   - All monetary figures must be stored and computed in **integer Indian Paise** (`Int`), never floating point.
   - Prices, fees, and permissions must be verified authoritatively from the PostgreSQL database, never trusted from client inputs.
   - All server actions and API routes must enforce strict Zod validation and RBAC guards (`requireAdmin()` or `requireStudent()`).

2. **Accessibility (WCAG 2.1 AA)**:
   - Base font size must remain at `16px`; no UI text may ever drop below `12px`.
   - All interactive touch targets (buttons, inputs, tabs) must meet a minimum size of `44×44px`.
   - Interactive elements must support visible keyboard focus rings (`:focus-visible`).
   - Modals must be accessible dialogs (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) and dismissable via the `Escape` key.

3. **Match Night Design Aesthetics**:
   - Utilize standardized CSS custom properties from `src/styles/tokens.css`.
   - Never use generic red/green/blue. Use authentic table tennis palette (`--ball-orange`, `--table-blue`, `--court-green`, `--umpire-red`, `--paddle-black`).
   - Maintain zero sci-fi / video-game terminology. Use authentic sports terminology (Athletes, Players, Coaches, Desk, Tournaments).

---

## 2. Git Workflow & Branching

- **Branch Naming**:
  - Features: `feat/feature-name` or `feat/phase-x`
  - Bug Fixes: `fix/issue-description`
  - Documentation: `docs/topic`
  - Performance: `perf/optimization`
- **Commit Messages**: Follow Conventional Commits format:
  ```text
  feat(fees): add CSV export with quote escaping
  fix(auth): enforce sliding window rate limiter reset
  docs(readme): update deployment runbook
  ```

---

## 3. Mandatory Pre-Commit Quality Gates

Before opening a pull request or pushing commits, you **MUST** run the four verification commands and ensure zero errors:

```bash
# 1. Run all unit & integration tests
npm test

# 2. Run ESLint checks
npm run lint

# 3. Verify strict TypeScript types
npx tsc --noEmit

# 4. Compile Next.js production bundle
npm run build
```

Any PR with failing tests, lint errors, or type errors will be rejected by GitHub Actions CI.

---

## 4. Pull Request Checklist

When submitting a PR, verify:
- [ ] No hardcoded secrets, passwords, or test phone numbers.
- [ ] New server actions or API endpoints have corresponding unit test coverage in `tests/unit/`.
- [ ] Database schema changes include a migration script and documentation in `CHANGELOG-MIGRATION.md`.
- [ ] Form elements have proper labels, touch targets, and accessible error states.
- [ ] Documentation updated if environment variables or operational workflows changed.

Thank you for helping keep Table Tennis Academy fast, secure, and accessible!
