# War Room in a Box: setup

## What's in this folder
- `setup_mac.sh` installs Node.js, the SpacetimeDB CLI, Thonny and Arduino IDE
- `spacetimedb/src/index.ts` is the server module (tables plus reducers for approvals, incident, scope, chat and the hash-chained log)
- `pico/` holds everything for the Pico 2 W: `code.py`, `rfid_test.py`, `lib/` and `font5x8.bin`
- `esp32/warroom_ap/warroom_ap.ino` makes the ESP32-S3 broadcast the WARROOM Wi-Fi

## 1. Install the tools (about 10 min, needs internet)
Open Terminal and run:
```
bash ~/Downloads/warroom/setup_mac.sh
```

## 2. Pico 2 W
1. Hold BOOTSEL, plug in the USB cable, then let go. A drive called RP2350 appears.
2. Download CircuitPython for the **Pico 2 W** from circuitpython.org/board/raspberry_pi_pico2_w and drag the `.uf2` file onto that drive. It reboots as **CIRCUITPY**.
3. Copy `pico/lib` (the whole folder), `pico/font5x8.bin` and `pico/rfid_test.py` onto CIRCUITPY. Rename `rfid_test.py` to `code.py`.
4. Open Thonny. In the bottom-right corner, pick "CircuitPython (generic)". Tap the blue fob and write down the ID it prints.
5. Paste that ID into `LEAD_FOB_UID` in `spacetimedb/src/index.ts`.
6. Copy `pico/code.py` onto CIRCUITPY, replacing the test file.

## 3. ESP32-S3 (WARROOM Wi-Fi)
1. In Arduino IDE, go to Settings, then "Additional boards manager URLs", and add:
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. In Boards Manager, install **esp32 by Espressif**.
3. Open `esp32/warroom_ap/warroom_ap.ino` and choose the board **ESP32S3 Dev Module**.
4. Plug in the USB-C port labeled **UART/COM**, select its port, then click Upload.
5. Change the password in the sketch first. WARROOM should then show up in your Wi-Fi list.

## 4. SpacetimeDB (do all of this BEFORE switching to WARROOM, while you still have internet)
Use two Terminal windows.

**Terminal 1: start the local server.** It listens on port 3000 on every network by default.
```
spacetime start
```

**Terminal 2: create the app.**
```
cd ~/Projects
spacetime dev --template react-ts --server local
```
- `--server local` matters. Without it, the CLI may publish to Maincloud, Spacetime's internet cloud, which breaks "isolated."
- When it asks for a project name, use `warroom`.
- Next, replace `warroom/spacetimedb/src/index.ts` with the file from this folder. `spacetime dev` republishes it and regenerates the bindings.
- The React app is at http://localhost:5173. Teammates edit `src/App.tsx`.

**Let other devices on WARROOM reach it:**
1. On the host laptop, joined to WARROOM, run `ipconfig getifaddr en0` to get its address, for example 192.168.4.2.
2. In `src/main.tsx`, set the host to `ws://192.168.4.2:3000`, or start with `VITE_SPACETIMEDB_HOST=ws://192.168.4.2:3000`.
3. Run Vite with `--host` so phones can open `http://192.168.4.2:5173`.

## 5. Lead console: catching what the Pico types
Add this to the Lead console page. It must be the focused browser tab.
```tsx
const panic = useReducer(reducers.panic);
const leadTap = useReducer(reducers.leadTap);
const leadCode = useReducer(reducers.leadCode);
useEffect(() => {
  let buf = '';
  const onKey = (e: KeyboardEvent) => {
    if (e.key === '!') buf = '';
    if (e.key === 'Enter' && buf.startsWith('!')) {
      e.preventDefault();
      const cmd = buf; buf = '';
      if (cmd === '!P') panic();
      else if (cmd.startsWith('!F')) leadTap({ uid: cmd.slice(2) });
      else if (cmd.startsWith('!C')) leadCode({ code: cmd.slice(2) });
      return;
    }
    if (e.key.length === 1) { buf = (buf + e.key).slice(-40); if (buf.startsWith('!')) e.preventDefault(); }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
```
Once, on the Lead laptop, call `registerConsole({ pin: '2468' })` (change the PIN in index.ts) so only that laptop can approve people.

## Known limits (be upfront with judges)
- All tables are `public`. A device on WARROOM that isn't approved could still subscribe and read them. The reducers block it from changing anything. See question 1 below.
- The log hash is FNV-1a, which is fine for showing tampering in a demo. A real product would use SHA-256.
- Basic RFID card IDs can be cloned. That's why the join code is the second factor.
