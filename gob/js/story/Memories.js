/**
 * Collectible "memories" — polaroids hidden around each chapter. Optional, but together
 * they tell the parts of the story GOB doesn't say out loud.
 */
export const MEMORIES = [
  // Chapter 1 — Good Morning
  { id: 'm1a', ch: 1, title: 'Flower names', glyph: '🌼', a: '#ffe78a', b: '#7ccf5b',
    text: 'A photo of four flower beds. On the back, in tiny careful letters:\n\n"Petunia. Sir Daisy. Marigold Jr. Steve."\n\n"They are good listeners."' },
  { id: 'm1b', ch: 1, title: 'Practice smile', glyph: '🙂', a: '#bfe6ff', b: '#e8f6ff',
    text: 'A picture of GOB in front of the pond, eyes wide.\n\nOn the back: "practising looking friendly. GOB has no mouth so the eyes have to do all the work."' },
  { id: 'm1c', ch: 1, title: 'Day 1', glyph: '▫️', a: '#9aa3b5', b: '#d6dae3',
    text: 'An empty baseplate. Just grey, no flowers, no trees, no anything.\n\nOn the back: "day 1. there is a sign that says COMING SOON. i will wait for it to come."' },
  { id: 'm1d', ch: 1, title: 'Kalo, upside down', glyph: '🙃', a: '#ffd23f', b: '#ffefa6',
    text: 'A blurry photo of Kalo hanging upside down from the slide.\n\nOn the back, new handwriting, big and messy: "KALO WAS HERE!!! (gobby took this. good job gobby)"' },
  // Chapter 2 — Funfair
  { id: 'm2a', ch: 2, title: 'Opening day', glyph: '🎪', a: '#ff9ab0', b: '#ffe1a6',
    text: 'The fair, brand new, every light on. No one in the picture.\n\nOn the back: "opening day!!! (attendance: me)"' },
  { id: 'm2b', ch: 2, title: 'Ticket stub #1', glyph: '🎟️', a: '#ffcf6b', b: '#ff8f6b',
    text: 'A ticket stub stuck to a photo. Ticket number 000001.\n\nGOB printed ten thousand tickets. This is the first one anyone ever used.' },
  { id: 'm2c', ch: 2, title: 'The top of the wheel', glyph: '🎡', a: '#4a5fb8', b: '#ffb36b',
    text: 'The view from the top of the ferris wheel at sunset. Two shadows on the seat.\n\nNo writing on this one. GOB didn\'t want to ruin it.' },
  { id: 'm2d', ch: 2, title: 'Obby champion', glyph: '🏆', a: '#7ed957', b: '#c3f2a6',
    text: 'Kalo holding the tiny trophy above GOB like a crown.\n\nOn the back (Kalo\'s writing): "CO-CHAMPIONS. no take backs."' },
  // Chapter 3 — Past the Fence
  { id: 'm3a', ch: 3, title: 'Last day', glyph: '📋', a: '#8592a3', b: '#c3c9cf',
    text: 'A sign photographed in an empty town:\n\n"THANKS FOR PLAYING! SERVERS CLOSE FRIDAY. WE HAD A GREAT TIME."\n\nSomeone has scratched underneath: "i didn\'t"' },
  { id: 'm3b', ch: 3, title: 'Yellow mailbox', glyph: '📬', a: '#c9b45a', b: '#e7dcaa',
    text: 'Kalo\'s old mailbox. Inside: forty-one letters, all addressed to friends, all returned.\n\n"RECIPIENT NOT FOUND."' },
  { id: 'm3c', ch: 3, title: 'Anyone there?', glyph: '📻', a: '#5b6472', b: '#a6adb8',
    text: 'The radio tower against a grey sky.\n\nKalo said: "if there\'s anyone out here, they\'ll hear us." The static said nothing back.' },
  // Chapter 4 — Respawn
  { id: 'm4a', ch: 4, title: 'Same place tomorrow', glyph: '⏳', a: '#868a92', b: '#b9bbbe',
    text: 'The spawn pad, from very close. Someone has been sitting next to it for a long time.\n\nThere are no footprints, because GOB doesn\'t have feet. Just a small square of dry ground in the rain.' },
  { id: 'm4b', ch: 4, title: 'Wilted', glyph: '🥀', a: '#857a6a', b: '#b5ab99',
    text: 'Petunia, Sir Daisy, Marigold Jr. and Steve. Brown now.\n\n"sorry. i forgot. i was busy waiting."' },
  { id: 'm4c', ch: 4, title: 'Fort flag', glyph: '🏳️', a: '#9a9fa8', b: '#cfd2d6',
    text: 'The fort flag, torn in half by the wind. You can still read "GOB +".' },
  // Chapter 5 — The Copy
  { id: 'm5a', ch: 5, title: 'Waiting room', glyph: '🚪', a: '#e9df9f', b: '#cfc27a',
    text: 'A long hallway. A sign at the end says WAITING FOR PLAYERS...\n\nThe sign has been there so long the letters have faded into the wall.' },
  { id: 'm5b', ch: 5, title: 'Instructions', glyph: '📝', a: '#e9dca0', b: '#fffbe6',
    text: 'A page in GOB\'s writing:\n\n"HOW TO MAKE A KALO\n1. yellow\n2. arms (2)\n3. legs (2)\n4. smile (?)\n5. make him say hi first"' },
  { id: 'm5c', ch: 5, title: 'Mirror', glyph: '🪞', a: '#b7b0a0', b: '#e5e0d4',
    text: 'A photo of a mirror. GOB in it. Behind GOB, the yellow copy, in exactly the same pose.\n\nIt looks a lot like GOB. That was the problem.' },
  // Chapter 6 — Day One
  { id: 'm6a', ch: 6, title: 'Name tag drafts', glyph: '🏷️', a: '#c43b4b', b: '#ffd6db',
    text: 'Dozens of name tags in a shoebox.\n"HELLO MY NAME IS GOB"\n"GOB (FRIENDLY)"\n"PLEASE SAY HI"\n"HI! IM GOB" — circled. "this one. short. not desperate."' },
  { id: 'm6b', ch: 6, title: 'Kalo\'s note', glyph: '✉️', a: '#ffd23f', b: '#fff6c9',
    text: 'A note in messy writing:\n\n"gobby — if i ever don\'t come back its NOT because of you. you\'re the best thing i found out here. don\'t wait at spawn forever ok?? go say hi to people. you\'re really good at it. — kalo"' },
  { id: 'm6c', ch: 6, title: 'Coming soon', glyph: '🪧', a: '#3a3f55', b: '#8a91a8',
    text: 'The very first sign. COMING SOON.\n\nGOB thought it meant someone. Maybe it did. It just took a while.' },
];

export const memoryById = (id) => MEMORIES.find((m) => m.id === id);
