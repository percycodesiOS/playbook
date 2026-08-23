# The Playbook

A single-page classroom dashboard for fifth- and sixth-grade CIRC.

**Live site:** https://percycodesios.github.io/playbook/

GitHub Pages publishes `index.html` from the root of the `main` branch.

## Day Glance

The Day Glance card shows the current rotation day, the current block, its ending time, and the next block. It updates from the device clock and private school calendar, skips listed no-school dates, and previews the next school day on weekends and closures. The five-day cycle advances automatically. Same-day manual corrections remain available, and **Auto** restores the calendar result.

The Day Glance schedule and calendar file is not stored in this public repository. Use **Setup > Import** once in each browser or device to load a private `Playbook Schedule.json` file. The imported data remains in that browser's local storage. **Export Backup** downloads the currently loaded private schedule and calendar. If the district activates a snow makeup day, update and reimport the private file before that date.

Run the clock and import validation tests with:

```text
node tests/day-glance.test.mjs
```

## Public-repository boundary

This repository intentionally contains only the files needed to publish the public site. Do not upload chat exports, planning captures, internal notes, student information, staff contact information, credentials, or private source material.
