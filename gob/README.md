# GOB

A story-driven third-person 3D game for the browser. You play GOB, a small slate-grey cube with two big bloodshot eyes and a red **HI! IM GOB** name tag.

GOB's world is bright and lovely: flowers with names, a pond with ducks, a playground, and a hill for watching sunsets. One morning a yellow blocky kid called **Kalo** joins the game and says hi first. The story starts there. It gets quieter, greyer and stranger from that point on.

Everything is built in code. All 3D uses **Three.js**, and all music and sound use the **Web Audio API**. The game has no image, model or audio files. Every texture, model, song and sound effect is generated when the game loads.

---

## Running it locally

The game uses ES modules, so browsers won't run it from a `file://` URL. Serve the `gob/` folder with any static web server.

**Python 3** (already installed on most machines):

```bash
cd gob
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser.

**Node.js**:

```bash
cd gob
npx serve .          # or: npx http-server -p 8000
```

**VS Code**: right-click `gob/index.html` and choose *Open with Live Server*.

Three.js is in `lib/`, so the game also runs offline. The only remote request is for Google Fonts, and the game falls back to system fonts if that fails.

**Browsers**: recent Chrome, Edge, Firefox or Safari with WebGL. Use headphones if you can, because the music matters. Audio starts after your first click or key press, as browsers require.

### Jumping to a chapter (for testing)

`index.html?chapter=4` starts directly at Chapter 4. `?chapter=3&beat=4` starts at a specific story beat. Chapters you have reached unlock in **Chapters** on the title screen.

---

## Controls

| Input | Action |
|---|---|
| **W A S D** / Arrow keys | Move |
| **Mouse** (click the game to capture it) | Look around |
| Mouse wheel | Zoom the camera |
| **Space** | Jump (hold to jump higher) |
| **E** / F | Interact |
| Space / E / Enter / Click | Advance dialogue |
| **Esc** / P | Pause |
| Gamepad | Left stick moves, right stick looks, A jumps, X interacts, Start pauses |
| Touch | On-screen stick, drag to look, JUMP / USE buttons |

---

## The story

| # | Chapter | What happens |
|---|---|---|
| 1 | **Good Morning** | GOB waters his flowers. Kalo joins. They tour the world, play tag, build a fort and watch the sunset. "Same place tomorrow?" |
| 2 | **Funfair** | GOB built a fair long ago and nobody has ever ridden anything. Together they power it up, collect tickets, pop balloons, race an obby and ride the ferris wheel. |
| 3 | **Past the Fence** | They visit the abandoned places outside GOB's world, with notes from people who left and Kalo's old house. Nobody answers on the radio tower. Then the "cleanup" starts and the ground falls away. |
| 4 | **Respawn** | The home baseplate again, now grey. GOB waits at the spawn for days, and echoes of Kalo replay their best moments. |
| 5 | **The Copy** | Behind GOB's door are unfinished liminal rooms, a looping hallway and a backwards fair. GOB builds a Kalo out of yellow blocks, but it only repeats what GOB says. |
| 6 | **Day One** | Under the baseplate is GOB's first room, with its walls covered in tally marks. This chapter reveals the loneliness, and a letter that went to the wrong mailbox. |
| 7 | **Hi, I'm GOB** | The epilogue. Dawn comes, the flowers return, and GOB puts up a new sign. The board says 1 player online. |

There are **20 memory polaroids** hidden across the chapters. They are optional, and some are hard to reach. You can read them in **Pause → Memories** or **Title → Memories**.

The full story takes roughly **1.5 to 2.5 hours**, depending on how much you explore and how quickly you read.

---

## Features

- **Third-person 3D**: an orbit camera with wall collision, auto-recentre, zoom and cutscene hand-off.
- **Physics-style movement**: AABB collision with step-up, coyote time, jump buffering, variable jump height, moving platforms, bounce pads and fall recovery.
- **GOB's model** matches the reference image. It has a stucco slate cube, pixel-art bloodshot eyes with octagonal irises (the left eye is smaller and lower), and the red name tag in the corner. GOB has no limbs or mouth, so he acts with hops, squash-and-stretch, tilts, blinks and eye direction.
- **Kalo** is a fully yellow R6-style blocky character with a floating name. He has walk, jump, wave, cheer, sit, point and push animations, and a classic break-apart.
- **Story engine**: async beat scripts, a typewriter dialogue system with per-character voice blips and choices, a cutscene director with letterbox and camera moves, objectives, markers and checkpoints.
- **Music**: one leitmotif ("GOB's song") arranged as chiptune, carnival organ, music box, detuned liminal flute and finally piano. It changes as the story does.
- **Atmosphere**: blended sky and mood presets (sunny, sunset, night, overcast, storm, grief, liminal, under, dawn), plus colour grading, vignette, film grain, rain, dust motes and ambience beds.
- **Menus**: title, chapter select, pause, settings (audio, sensitivity, invert Y, FOV, quality, text speed, screen shake, FPS), controls, a memories gallery and credits.
- **Saving**: an autosave at every checkpoint plus 3 manual slots in `localStorage`. Settings and unlocked chapters persist too.
- **Robustness**: a loading screen with progress, a WebGL check, an error screen that can return you to the title, auto-pause when the tab loses focus or the mouse is released, and window-resize handling.

---

## Project structure

```
gob/
├── index.html              Page shell, HUD/menu containers, import map
├── css/style.css           UI styling
├── lib/three.module.js     Three.js r160 (MIT)
├── assets/gob-reference.png  The reference image GOB is built from
└── js/
    ├── main.js             Entry point, WebGL check, global error handling
    ├── core/               Engine (renderer, lights, resize), Input, Physics, Game (loop, chapter runner, pause, save/load), utils
    ├── render/             Procedural Textures (GOB's face, eyes, studs...), Sky & moods, Particles & weather
    ├── characters/         GobModel, KaloModel (+ ghost/copy variants), KaloNPC (AI)
    ├── player/             PlayerController, CameraController
    ├── world/              Builder (level kit: boxes, trees, fences, signs, water...), SunnyPlate (GOB's home, 3 variants)
    ├── levels/             ChapterBase + Chapter1…7, MenuScene, chapter registry
    ├── story/              Dialogue, Cutscene, Interactions & Marker, Memories data
    ├── audio/              AudioEngine (buses, reverb, synth voices), Music (sequencer + tracks), Sfx (effects + ambience)
    ├── ui/                 HUD, Menus, Loading
    └── save/               SaveSystem, Settings
```

### Adding to it

- **New chapter**: subclass `ChapterBase`, implement `build(progress)` and `beats()`, and register it in `levels/chapters.js`. Each beat is an `async run()` that can `await this.say([...])`, `this.reach(pos)`, `this.use(pos, label)`, `this.collectAll(...)`, `this.cam(...)` and so on. Quitting cancels beats automatically.
- **New music**: add an entry to `TRACKS` in `audio/Music.js`. Layers are `melody`, `arp`, `bass`, `pad`, `drum`, `bell` and `drone`.
- **Dialogue lines** use `'G: text'` for GOB, `'K:'` for Kalo, `'C:'` for the copy, `'D:'` for the diary, `'L:'` for letters and `'N:'` for narration. A line can also be `{ choice: [...] }` or an inline function.

---

## Credits

Three.js © three.js authors (MIT, see `lib/THREE_LICENSE`). Fredoka and VT323 fonts via Google Fonts (OFL). Everything else, including the story, world, code, music and sound, was made for this project.
