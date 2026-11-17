# TARA tarha — ESP32 prototype firmware (13 Phase 7)

The tarha is a Bluetooth LE peripheral that sends **one small summary per second** (three band powers + sensor
fit — never a raw brain signal) and obeys cooling commands within its own safety limits.

| Part | What it does |
|---|---|
| `src/tara_protocol.h` | Packet layouts (07 §2), CRC-8, and the cooling safety rules. Plain C++ — the same file is checked on a computer. |
| `src/main.cpp` | ESP32 + NimBLE: GATT service, the stress knob, the cooling output, blink-to-identify. |
| `test_host/check.cpp` | Builds `tara_protocol.h` on a computer, prints packets, asserts the safety limits. CI compares the bytes with the app. |

## Build & flash (you, with the board)

1. Install [PlatformIO](https://platformio.org/install/cli) (`pip install platformio`) or the PlatformIO VS Code extension.
2. Plug the ESP32 dev board in with a **data** USB cable.
3. `cd firmware && pio run -t upload` then `pio device monitor`.
4. In TARA: **Connect** → allow Bluetooth → the tarha appears as `TARA-XXXX`. Android asks to pair once ("Just Works").

Check it on the computer without a board: `c++ -std=c++17 -Ifirmware/src firmware/test_host/check.cpp -o check && ./check`.

## Wiring (breadboard)

| ESP32 pin | Connects to | Purpose |
|---|---|---|
| GPIO 34 | Potentiometer wiper (outer legs to 3V3 and GND) | **Stress knob**: left = calm, right = stressed |
| GPIO 0 (BOOT button) | on-board | Hold = "sensor not touching skin" (fit drops, no alerts) |
| GPIO 25 | 1 kΩ → base of NPN (2N2222); emitter → GND; collector → fan/LED (−) | **Cooling** output |
| 5V / VIN | fan (+) or blue LED (+) through 220 Ω | Cooling power (add a flyback diode across a fan) |
| GPIO 2 | on-board LED | Blinks 3 s when the app asks "which one is yours?" |
| GPIO 35 (optional) | battery + through 100 kΩ/100 kΩ divider | Battery %, then set `USE_BATTERY_ADC 1` |

## Tinkercad diagram (13 Phase 7 deliverable)

Tinkercad Circuits has no ESP32, so the plan uses an **Arduino Uno as the stand-in** and labels it. In Tinkercad:

1. Add **Arduino Uno R3**, **Potentiometer**, **NPN transistor**, **DC Motor** (fan) *or* **blue LED + 220 Ω**, a **1 kΩ resistor**, a **diode**, and a **9 V battery**.
2. Potentiometer: outer legs to 5V and GND, wiper to **A0**.
3. Pin **9** → 1 kΩ → transistor base; emitter → GND; collector → motor (−); motor (+) → battery (+); diode across the motor; battery (−) → GND.
4. Add text notes: **"BLE module = ESP32 in the real build"** next to the Uno, and **"Sensor position: behind the ear, touching skin"** next to the potentiometer.
5. Share the link and screenshot it for the submission (13 Phase 16).

## Acceptance (needs the board + an Android phone)

- Turn the knob right → the app reaches High stress → the prompt appears within the sustain window + 5 s.
- Tap **Yes — Cool** → the fan/LED turns on within 1 s.
- Force-stop the app while cooling → the firmware still stops at the end of the timer and never runs longer than 20 min (then a 5 min rest).
- Hold BOOT → fit chip shows "No contact"; no stress prompt fires.
