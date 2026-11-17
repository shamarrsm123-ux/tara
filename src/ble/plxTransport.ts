// Phone BleTransport over react-native-ble-plx (06 §2). Scans only for the TARA service, moves bytes as base64.
// 🟡 Encrypted-link check: ble-plx cannot report a link's security level. The tarha's characteristics require an
// encrypted, bonded link (firmware: READ_ENC / NOTIFY_ENC / WRITE_ENC), so Android bonds on first access; a read
// that fails is treated as "not encrypted" and refused. A device that does not require encryption cannot be told
// apart from the phone side — the firmware is the authority here (07 §2.2).
import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';
import type { FoundTarha } from '../shared/tarhaSource';
import type { BleLink, BleTransport, CharKey } from './BleTarhaSource';
import { fromBase64, TARHA_NAME_PREFIX, toBase64, UUIDS } from './protocol';

const CONNECT_TIMEOUT_MS = 10_000;

let shared: BleManager | null = null;
const manager = (): BleManager => (shared ??= new BleManager());

function linkFor(device: Device): BleLink {
  const id = device.id;
  const uuid = (char: CharKey) => UUIDS[char];
  return {
    async isEncrypted() {
      try {
        await device.readCharacteristicForService(UUIDS.service, UUIDS.status);
        return true;
      } catch {
        return false;
      }
    },
    async read(char) {
      const c = await device.readCharacteristicForService(UUIDS.service, uuid(char));
      return fromBase64(c.value ?? '');
    },
    async write(char, bytes) {
      await device.writeCharacteristicWithResponseForService(UUIDS.service, uuid(char), toBase64(bytes));
    },
    monitor(char, cb) {
      const sub: Subscription = device.monitorCharacteristicForService(UUIDS.service, uuid(char), (error, c) => {
        if (error === null && c?.value) cb(fromBase64(c.value));
      });
      return () => sub.remove();
    },
    onDisconnected(cb) {
      const sub = manager().onDeviceDisconnected(id, () => cb());
      return () => sub.remove();
    },
    async close() {
      await manager()
        .cancelDeviceConnection(id)
        .catch(() => undefined); // already disconnected
    },
  };
}

export const plxTransport: BleTransport = {
  scan(timeoutMs) {
    return new Promise<FoundTarha[]>((resolve) => {
      const found = new Map<string, FoundTarha>();
      const finish = () => {
        manager().stopDeviceScan();
        resolve([...found.values()]);
      };
      const timer = setTimeout(finish, timeoutMs);
      manager()
        .startDeviceScan([UUIDS.service], { allowDuplicates: false }, (error, device) => {
          if (error !== null) {
            clearTimeout(timer);
            finish(); // Bluetooth off or not allowed: nothing found; the UI offers Try again / demo
            return;
          }
          const name = device?.name ?? device?.localName ?? null;
          if (device !== null && name !== null && name.startsWith(TARHA_NAME_PREFIX)) found.set(device.id, { id: device.id, name });
        })
        .catch(() => {
          clearTimeout(timer);
          finish();
        });
    });
  },
  async connect(id) {
    const device = await manager().connectToDevice(id, { timeout: CONNECT_TIMEOUT_MS });
    await device.discoverAllServicesAndCharacteristics();
    return linkFor(device);
  },
};
