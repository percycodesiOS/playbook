# The Playbook

A single-page classroom dashboard for fifth- and sixth-grade CIRC.

**Live site:** https://percycodesios.github.io/playbook/

GitHub Pages publishes `index.html` from the root of the `main` branch.

## Day Glance

The Day Glance card shows the selected rotation day, the current block, its ending time, and the next block. It updates from the device clock and can be minimized without covering the Playbook controls. The five-day cycle stays under manual control, and changing the day changes the embedded Playbook day too.

The Day Glance schedule file is not stored in this public repository. Use **Setup > Import** once in each browser or device to load a private `Playbook Schedule.json` file. The imported schedule remains in that browser's local storage. **Export Backup** downloads the currently loaded private schedule.

Run the clock and import validation tests with:

```text
node tests/day-glance.test.mjs
```

## Public-repository boundary

This repository intentionally contains only the files needed to publish the public site. Do not upload chat exports, planning captures, internal notes, student information, staff contact information, credentials, or private source material.
