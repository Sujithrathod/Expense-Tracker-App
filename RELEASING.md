# Releasing the Android app (APK) with GitHub Actions

This app is released as an `.apk` file attached to a **GitHub Release**. GitHub builds it on its own
servers, so you don't need Android Studio or an Expo account.

## How it works

```
you: git tag v1.0.1 && git push origin v1.0.1
        │
        ▼
GitHub Actions runs .github/workflows/release-apk.yml on a fresh Linux machine:
  1. checks out the code, installs Node 22 + Java 17 + npm packages
  2. `npx expo prebuild`      → generates the native android/ project from app.json
                                (version = tag, versionCode = run number)
  3. restores the signing key from repository secrets
  4. `./gradlew assembleRelease` → compiles and signs the APK
  5. creates a Release named after the tag and attaches ExpenseTracker-v1.0.1.apk
        │
        ▼
phone: open github.com/<you>/<repo>/releases/latest → tap the .apk → Install / Update
```

## Why the signing key matters

Android only installs signed apps, and it only accepts an **update** if it is signed with the
**same key** as the installed version. The key lives in `~/.expense-tracker-signing/` on the Mac
(never in the repo):

| File | What it is |
| --- | --- |
| `release.jks` | the keystore (the key itself) |
| `release.jks.base64` | the same file as text, for storing in a GitHub secret |
| `credentials.env` | alias + passwords |

**Back this folder up.** If it's lost, you can't update the installed app. You'd have to uninstall it,
which deletes the expenses stored on the phone.

## One-time setup

```bash
brew install gh                      # GitHub CLI
gh auth login                        # log in (choose GitHub.com → HTTPS → browser)

# create the repo from this folder and push the code
gh repo create expense-tracker --public --source . --push

# store the signing key as encrypted repository secrets
KD=~/.expense-tracker-signing
gh secret set ANDROID_KEYSTORE_BASE64 < $KD/release.jks.base64
source $KD/credentials.env
gh secret set ANDROID_KEY_ALIAS --body "$ANDROID_KEY_ALIAS"
gh secret set ANDROID_KEYSTORE_PASSWORD --body "$ANDROID_KEYSTORE_PASSWORD"
gh secret set ANDROID_KEY_PASSWORD --body "$ANDROID_KEY_PASSWORD"
```

Secrets are encrypted by GitHub and are never shown in logs, even in a public repo.

## Every release

1. Commit and push your changes:
   ```bash
   git add -A && git commit -m "Describe the change" && git push
   ```
2. Tag a new version (bump the number each time) and push the tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. Watch the build: `gh run watch` (or the **Actions** tab on GitHub). It takes about 10–20 minutes.
4. On the phone, open `https://github.com/<you>/expense-tracker/releases/latest` and install the APK.
   Your expenses are kept because it's an update signed with the same key.

## Installing on the phone

1. Open the Release page in Chrome on the phone and tap the `.apk` file.
2. The first time, Android asks to allow **Install unknown apps** for Chrome. Allow it.
3. Tap **Install** (or **Update**). Play Protect may warn that the app is unknown. Choose
   **Install anyway**. That warning appears for any app that isn't from the Play Store.
4. For the widget: long-press the home screen → **Widgets** → **Expense Tracker** → drag **Spending**.

## Troubleshooting

- **Build fails at "Restore the signing key" / signing errors**: a secret is missing or misspelled.
  Check with `gh secret list`.
- **"App not installed" on the phone**: the APK was signed with a different key than the installed
  app, or its versionCode is lower. Uninstall the old app first (this deletes its data).
- **Run a build without releasing**: Actions tab → *Release Android APK* → *Run workflow*. The APK
  appears under the run's **Artifacts**.
