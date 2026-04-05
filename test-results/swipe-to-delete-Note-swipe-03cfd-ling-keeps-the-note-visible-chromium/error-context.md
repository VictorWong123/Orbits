# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: swipe-to-delete.spec.ts >> Note swipe-to-delete on profile page >> cancelling keeps the note visible
- Location: tests/swipe-to-delete.spec.ts:197:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/jv/xjpwsrls2_vcsz9jx21vkt440000gn/T/cursor-sandbox-cache/debae5fb0470dedbf18d5f23f2028c23/playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```