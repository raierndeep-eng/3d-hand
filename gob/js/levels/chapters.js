/** Chapter registry. Modules load lazily so the title screen appears quickly. */
export const CHAPTERS = [
  { title: 'Good Morning', subtitle: 'Someone new on the baseplate.', tip: 'Everything is bright today.', load: () => import('./Chapter1.js') },
  { title: 'Funfair', subtitle: 'Every light on, for the first time.', tip: 'GOB built the fair a long time ago. Nobody has ridden anything yet.', load: () => import('./Chapter2.js') },
  { title: 'Past the Fence', subtitle: 'The old places, where everyone left.', tip: 'Stay close to Kalo.', load: () => import('./Chapter3.js') },
  { title: 'Respawn', subtitle: 'Same place tomorrow.', tip: 'Respawning in 5...', load: () => import('./Chapter4.js') },
  { title: 'The Copy', subtitle: 'If he can’t come back, make him.', tip: 'Waiting for players...', load: () => import('./Chapter5.js') },
  { title: 'Day One', subtitle: 'Underneath the baseplate.', tip: 'Count the days.', load: () => import('./Chapter6.js') },
  { title: 'Hi, I’m GOB', subtitle: 'Epilogue. Same place tomorrow.', tip: 'Good morning, baseplate.', load: () => import('./Chapter7.js') },
];
