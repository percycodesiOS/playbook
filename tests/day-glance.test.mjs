import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(source, /#playbook\{[^}]*height:calc\(100% - var\(--glance-offset\)\)/,
  'the embedded Playbook must fill the screen below Day Glance');
const match = source.match(/\/\* DAY GLANCE PURE START \*\/([\s\S]*?)\/\* DAY GLANCE PURE END \*\//);
assert.ok(match, 'Day Glance production functions are missing');

const load = new Function(`${match[1]}; return {
  teacherTimeToMinutes,
  formatSchoolMinutes,
  parseTeacherClockRange,
  teacherClockView,
  validateTeacherScheduleBundle,
  readPlaybookDay,
  withPlaybookDay
};`);
const {
  teacherTimeToMinutes,
  formatSchoolMinutes,
  parseTeacherClockRange,
  teacherClockView,
  validateTeacherScheduleBundle,
  readPlaybookDay,
  withPlaybookDay
} = load();

const day = {
  day: 2,
  label: 'DAY 2',
  events: [
    { time: '8:40-8:55', type: 'duty', label: 'Arrival duty' },
    { time: '9:05-9:40', type: 'teach', label: 'Class A' },
    { time: '9:43-10:18', type: 'prep', label: 'Prep' },
    { time: '3:25-3:40', type: 'duty', label: 'Dismissal duty' }
  ]
};

assert.equal(teacherTimeToMinutes('8:40'), 520, '8:40 must stay in the morning');
assert.equal(teacherTimeToMinutes('12:20'), 740, '12:20 must stay at noon');
assert.equal(teacherTimeToMinutes('1:30'), 810, '1:30 must resolve to the afternoon');
assert.equal(teacherTimeToMinutes('3:40'), 940, '3:40 must resolve to the afternoon');
assert.equal(teacherTimeToMinutes('13:00'), null, '24-hour input is not part of the schedule contract');
assert.equal(formatSchoolMinutes(520), '8:40 AM');
assert.equal(formatSchoolMinutes(780), '1:00 PM');
assert.deepEqual(parseTeacherClockRange('9:05-9:40'), { start: 545, end: 580 });
assert.equal(parseTeacherClockRange('9:40-9:05'), null, 'a reversed range must be rejected');

assert.deepEqual(teacherClockView(day, 510), {
  phase: 'before', day: 2, dayLabel: 'DAY 2', now: 'Before first block',
  ends: '8:40 AM', next: 'Arrival duty', nextTime: '8:40 AM', type: 'support'
});
assert.deepEqual(teacherClockView(day, 520), {
  phase: 'active', day: 2, dayLabel: 'DAY 2', now: 'Arrival duty',
  ends: '8:55 AM', next: 'Class A', nextTime: '9:05 AM', type: 'duty'
});
assert.deepEqual(teacherClockView(day, 535), {
  phase: 'gap', day: 2, dayLabel: 'DAY 2', now: 'Between blocks',
  ends: '9:05 AM', next: 'Class A', nextTime: '9:05 AM', type: 'support'
});
assert.deepEqual(teacherClockView(day, 580), {
  phase: 'gap', day: 2, dayLabel: 'DAY 2', now: 'Between blocks',
  ends: '9:43 AM', next: 'Prep', nextTime: '9:43 AM', type: 'support'
});
assert.deepEqual(teacherClockView(day, 583), {
  phase: 'active', day: 2, dayLabel: 'DAY 2', now: 'Prep',
  ends: '10:18 AM', next: 'Dismissal duty', nextTime: '3:25 PM', type: 'prep'
});
assert.deepEqual(teacherClockView(day, 940), {
  phase: 'complete', day: 2, dayLabel: 'DAY 2', now: 'Day complete',
  ends: 'Done', next: 'Choose tomorrow', nextTime: '', type: 'support'
});

const validBundle = {
  format: 'playbook.teacherPlan.v1',
  preferredDay: 2,
  plan: {
    status: 'official',
    days: [
      { day: 1, label: 'DAY 1', events: [{ time: '8:40-8:55', type: 'duty', label: 'Arrival' }] },
      { day: 2, label: 'DAY 2', events: [{ time: '9:05-9:40', type: 'teach', label: 'Class A' }] },
      { day: 3, label: 'DAY 3', events: [{ time: '12:20-12:50', type: 'lunch', label: 'Lunch' }] },
      { day: 4, label: 'DAY 4', events: [{ time: '1:35-2:10', type: 'prep', label: 'Prep' }] },
      { day: 5, label: 'DAY 5', events: [{ time: '3:25-3:40', type: 'duty', label: 'Dismissal' }] }
    ]
  }
};
const checked = validateTeacherScheduleBundle(validBundle);
assert.equal(checked.ok, true, 'the documented five-day bundle must import');
assert.equal(checked.preferredDay, 2);
assert.equal(checked.plan.days[1].events[0].label, 'Class A');

assert.equal(validateTeacherScheduleBundle({ ...validBundle, format: 'wrong' }).ok, false,
  'an unrelated JSON file must not overwrite the saved schedule');

const malformed = structuredClone(validBundle);
malformed.plan.days[1].events[0].time = 'not a time';
assert.equal(validateTeacherScheduleBundle(malformed).ok, false,
  'a malformed time must stop the entire import');

const overlapping = structuredClone(validBundle);
overlapping.plan.days[1].events.push({ time: '9:30-10:00', type: 'support', label: 'Overlap' });
assert.equal(validateTeacherScheduleBundle(overlapping).ok, false,
  'overlapping blocks must stop the entire import');

const appState = {
  pointers: { teacher: 4 },
  notes: { day2: 'Keep this progress' },
  teacher: 'macek',
  dayOverride: { day: 1, date: '2026-08-20' }
};
assert.equal(readPlaybookDay(appState, '2026-08-20'), 1,
  'Day Glance must read the Playbook day for today');
assert.equal(readPlaybookDay(appState, '2026-08-21'), null,
  'a stale Playbook day override must not become today\'s day');
assert.equal(readPlaybookDay({ dayOverride: { day: 9, date: '2026-08-20' } }, '2026-08-20'), null,
  'an invalid Playbook day must be rejected');

const changedState = withPlaybookDay(appState, 2, '2026-08-20');
assert.deepEqual(changedState.dayOverride, { day: 2, date: '2026-08-20' },
  'the wrapper must set the same day the Playbook will load');
assert.deepEqual(changedState.pointers, appState.pointers,
  'changing the active day must preserve Playbook progress');
assert.deepEqual(changedState.notes, appState.notes,
  'changing the active day must preserve Playbook notes');
assert.equal(withPlaybookDay(appState, 0, '2026-08-20'), null,
  'an invalid day must not produce a Playbook state update');

console.log('Day Glance tests passed');
