# Preferences CLI

This Node CLI reads and updates one JSON preferences file supplied by the caller.

```sh
node prefs.mjs ./settings.json get theme
node prefs.mjs ./settings.json set theme dark
node --test prefs.test.mjs
```

The file can start empty or be missing. It stores string preferences in a regular JSON file. Set preserves the POSIX mode bits and other preferences. A competing writer receives a busy result. If a forced stop leaves a lock, the file owner can reconcile the writer and remove that exact lock before retrying.
