// Server-side mirror of site/js/book.js's SERVICES catalog, in pence for
// Stripe. Kept as its own small duplicated source of truth rather than a
// shared import - no build step joins browser and Worker code in this
// project.
export const SERVICE_CATALOG = {
  'tuition-parent': {
    label: '1:1 Tuition', role: 'parent', sessionMinutes: 60,
    single: { label: 'Single session', amount: 5000 },
    pack: { label: 'Monthly pack (4 sessions)', amount: 19000, sessions: 4 }
  },
  'sensory-parent': {
    label: 'Sensory Profile Builder', role: 'parent', sessionMinutes: 60,
    single: { label: 'One profile', amount: 10000 }
  },
  support: {
    label: 'Support Sessions', role: 'parent', sessionMinutes: 60,
    single: { label: 'Single hour', amount: 5000 }
  },
  'tuition-school': {
    label: '1:1 Pupil Tuition', role: 'school', sessionMinutes: 60,
    single: { label: 'Single session', amount: 6000 },
    pack: { label: 'Term pack (7 sessions)', amount: 39900, sessions: 7 }
  },
  'sensory-school': {
    label: 'Sensory Profile Builder', role: 'school', sessionMinutes: 60,
    single: { label: 'Single profile', amount: 10000 },
    pack: { label: 'Pack of 5 profiles', amount: 47500, sessions: 5 }
  },
  'sentence-steps': {
    label: 'Sentence Steps Intervention', role: 'school', sessionMinutes: 60,
    single: { label: 'Single hour', amount: 10000 },
    pack: { label: 'Term pack (7 x 1hr slots)', amount: 66500, sessions: 7 }
  },
  'build-buddies': {
    label: 'Build Buddies Intervention', role: 'school', sessionMinutes: 60,
    single: { label: 'Single hour', amount: 10000 },
    pack: { label: 'Term pack (7 x 1hr slots)', amount: 66500, sessions: 7 }
  }
};
