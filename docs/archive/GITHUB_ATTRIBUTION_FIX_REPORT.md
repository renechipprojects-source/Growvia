# Growvia School ERP — GitHub Commit Attribution & Identity Audit Report

This report explains the resolution and technical requirements for **GitHub Commit Attribution** on `https://github.com/renechipprojects-source/Growvia.git`.

---

## 1. Important Technical Distinction

To understand why GitHub attributes commits to a specific profile, we must distinguish between **three independent layers**:

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 1. Git Author Identity (Local Git Header)                               │
 │    Configured via `git config user.name` & `user.email`.                │
 │    Current: Renechip Projects <ramarbala004@gmail.com>                  │
 └─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 2. GitHub Authentication Identity (HTTP Connection / OAuth Token)      │
 │    Credentials stored in Windows Credential Manager / GCM.              │
 │    Used to verify WRITE access permissions when running `git push`.    │
 └─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ 3. GitHub Commit Attribution (GitHub UI Web Representation)             │
 │    How GitHub links a commit on github.com to an avatar & user profile. │
 │    GitHub matches the `user.email` header against account email lists.  │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Why GitHub Attributes Commits to `Bala0054`

1. **Commit Email Matching**:
   When a commit is pushed to GitHub, GitHub checks the author email address (`ramarbala004@gmail.com`) against registered user emails in GitHub's database.
2. **Account Linking**:
   If `ramarbala004@gmail.com` is added under **GitHub Settings -> Emails** for the user `Bala0054`, GitHub automatically links every commit with `ramarbala004@gmail.com` to `Bala0054`, regardless of `user.name` string in local git config.
3. **How to Attribute to the New Account (`renechipprojects-source`)**:
   - Option A: Log into the new GitHub account (`renechipprojects-source`) on github.com, navigate to **Settings -> Emails**, and add/verify `ramarbala004@gmail.com` (or remove `ramarbala004@gmail.com` from `Bala0054`).
   - Option B: Use the official GitHub noreply email address of the new account (e.g. `renechipprojects-source@users.noreply.github.com`) in `git config user.email`.

---

## 3. Execution Log & Verification

- **Local Git Identity**: `Renechip Projects <ramarbala004@gmail.com>`
- **Credential Manager**: `git:https://github.com` credential erased from Windows Credential Manager (`cmdkey /delete`).
- **Latest Verification Commit**: `8bc609a | Renechip Projects <ramarbala004@gmail.com> | chore: verify Growvia GitHub attribution`
- **History Protection**: Zero commits rewritten or force pushed.
