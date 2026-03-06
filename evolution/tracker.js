// Dev Activity Tracker - tracks git/developer events for evolution triggers
// Persists to localStorage so progress survives page reloads
// Can also read from .events.json written by git hooks

const STORAGE_KEY = 'bugmon_dev_events';

const defaultEvents = {
  commits: 0,
  prs_merged: 0,
  bugs_fixed: 0,
  tests_passing: 0,
  refactors: 0,
  code_reviews: 0,
  conflicts_resolved: 0,
  ci_passes: 0,
  deploys: 0,
  docs_written: 0
};

let events = { ...defaultEvents };
let listeners = [];

export function initTracker() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      events = { ...defaultEvents, ...parsed };
    } catch (e) {
      events = { ...defaultEvents };
    }
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function logEvent(eventType) {
  if (!(eventType in events)) return false;
  events[eventType]++;
  save();
  listeners.forEach(fn => fn(eventType, events[eventType]));
  return true;
}

export function getEvents() {
  return { ...events };
}

export function getEventCount(eventType) {
  return events[eventType] || 0;
}

export function onEvent(fn) {
  listeners.push(fn);
}

export function removeEventListener(fn) {
  listeners = listeners.filter(l => l !== fn);
}

// Import events from a .events.json file (written by git hooks)
export async function importFromFile() {
  try {
    const res = await fetch('.events.json');
    if (!res.ok) return false;
    const data = await res.json();
    let imported = false;
    for (const key of Object.keys(defaultEvents)) {
      if (data[key] !== undefined && data[key] > events[key]) {
        const diff = data[key] - events[key];
        events[key] = data[key];
        imported = true;
        for (let i = 0; i < diff; i++) {
          listeners.forEach(fn => fn(key, events[key]));
        }
      }
    }
    if (imported) save();
    return imported;
  } catch (e) {
    return false;
  }
}

// Reset all events (for testing)
export function resetEvents() {
  events = { ...defaultEvents };
  save();
}
