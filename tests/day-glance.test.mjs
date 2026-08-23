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
  validateTeacherCalendar,
  validateTeacherScheduleBundle,
  resolveTeacherDay,
  readPlaybookDay,
  withPlaybookDay,
  withoutPlaybookDay
};`);
const {
  teacherTimeToMinutes,
  formatSchoolMinutes,
  parseTeacherClockRange,
  teacherClockView,
  validateTeacherCalendar,
  validateTeacherScheduleBundle,
  resolveTeacherDay,
  readPlaybookDay,
  withPlaybookDay,
  withoutPlaybookDay
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
  calendar: {
    anchorDate: '2026-08-20',
    anchorDay: 1,
    lastDate: '2027-06-04',
    noSchool: ['2026-09-07']
  },
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
assert.deepEqual(checked.calendar, validBundle.calendar,
  'the private school calendar must survive validation');

assert.equal(validateTeacherScheduleBundle({ ...validBundle, calendar: undefined }).ok, false,
  'a schedule without its private school calendar must be reimported');

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

assert.deepEqual(validateTeacherCalendar(validBundle.calendar), {
  ok: true,
  calendar: validBundle.calendar
}, 'the official calendar shape must validate without changing its dates');

assert.equal(validateTeacherCalendar({ ...validBundle.calendar, anchorDate: '2026-02-30' }).ok, false,
  'a calendar with an impossible date must be rejected');
assert.equal(validateTeacherCalendar({ ...validBundle.calendar, anchorDate: '2026-08-22' }).ok, false,
  'a calendar cannot anchor the cycle on a weekend');
assert.equal(validateTeacherCalendar({ ...validBundle.calendar, noSchool: ['2026-08-20'] }).ok, false,
  'the cycle anchor cannot also be a no-school day');
assert.equal(validateTeacherCalendar({ ...validBundle.calendar, noSchool: ['2026-09-07', '2026-09-07'] }).ok, false,
  'duplicate no-school dates must be rejected instead of counted twice');

assert.deepEqual(resolveTeacherDay(validBundle.calendar, '2026-08-20', {}), {
  day: 1, date: '2026-08-20', relation: 'today', source: 'calendar'
}, 'the first student day must resolve to Day 1');
assert.deepEqual(resolveTeacherDay(validBundle.calendar, '2026-08-21', {}), {
  day: 2, date: '2026-08-21', relation: 'today', source: 'calendar'
}, 'Friday August 21 must resolve to Day 2');
assert.deepEqual(resolveTeacherDay(validBundle.calendar, '2026-08-22', {
  dayOverride: { day: 2, date: '2026-08-21' }
}), {
  day: 3, date: '2026-08-24', relation: 'next', source: 'calendar'
}, 'a stale Friday choice must not overwrite the next school day on Saturday');
assert.deepEqual(resolveTeacherDay(validBundle.calendar, '2026-08-24', {}), {
  day: 3, date: '2026-08-24', relation: 'today', source: 'calendar'
}, 'Monday August 24 must resolve to Day 3');
assert.deepEqual(resolveTeacherDay(validBundle.calendar, '2026-08-24', {
  dayOverride: { day: 5, date: '2026-08-24' }
}), {
  day: 5, date: '2026-08-24', relation: 'today', source: 'manual'
}, 'a same-date manual correction must remain available');
assert.deepEqual(resolveTeacherDay(validBundle.calendar, '2026-09-07', {}), {
  day: 3, date: '2026-09-08', relation: 'next', source: 'calendar'
}, 'Labor Day must be skipped without advancing the five-day rotation');
assert.equal(resolveTeacherDay(validBundle.calendar, '2027-06-05', {}), null,
  'the app must not invent rotation days after the official calendar ends');

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

const clearedState = withoutPlaybookDay(appState, '2026-08-20');
assert.equal('dayOverride' in clearedState, false,
  'a non-school day must be able to clear a same-date app override');
assert.deepEqual(clearedState.pointers, appState.pointers,
  'clearing a day override must preserve Playbook progress');
assert.deepEqual(withoutPlaybookDay(appState, '2026-08-21'), appState,
  'clearing today must not remove a differently dated override');

console.log('Day Glance tests passed');
