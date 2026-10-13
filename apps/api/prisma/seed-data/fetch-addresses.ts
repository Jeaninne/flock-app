// This script generates random points in Dnipro,
// reverse-geocodes them via Nominatim (OpenStreetMap)
// and saves addresses as a seed fixture.
// (Basically just for fancy address in demo data for now)
// Nominatim usage policy: max 1 req/s, real User-Agent.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

type SeedAddress = { address: string; lat: number; lng: number };

type NominatimResult = {
  lat: string;
  lon: string;
  address?: { road?: string; city?: string; house_number?: string };
};

const TARGET = 30;
const MAX_ATTEMPTS = 150;
const DELAY_MS = 1100;
const BBOX = { minLat: 48.38, maxLat: 48.55, minLng: 34.85, maxLng: 35.2 };
const CITY = 'Дніпро';
const LANG = 'uk';
const OUT_FILE = path.join(import.meta.dirname, 'addresses.json');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomIn = (min: number, max: number) => min + Math.random() * (max - min);
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    zoom: '18', // street level + house numbers
    'accept-language': LANG,
  }).toString();

  const res = await fetch(url, {
    headers: { 'User-Agent': 'flock-app seed (https://github.com/Jeaninne/flock-app)' },
  });
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  return (await res.json()) as NominatimResult;
}

// Keep only Dnipro addresses that have a house number
function toSeedAddress(r: NominatimResult): SeedAddress | null {
  const { road, house_number, city } = r.address ?? {};
  if (!road || !house_number || city !== CITY) return null;
  return {
    address: `${road} ${house_number}`,
    lat: round6(Number(r.lat)),
    lng: round6(Number(r.lon)),
  };
}

async function main() {
  const byAddress = new Map<string, SeedAddress>();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && byAddress.size < TARGET; attempt++) {
    const lat = randomIn(BBOX.minLat, BBOX.maxLat);
    const lng = randomIn(BBOX.minLng, BBOX.maxLng);
    const seed = toSeedAddress(await reverseGeocode(lat, lng));

    if (seed && !byAddress.has(seed.address)) {
      byAddress.set(seed.address, seed);
      console.log(`[${byAddress.size}/${TARGET}] ${seed.address}`);
    }
    await sleep(DELAY_MS);
  }

  const addresses = [...byAddress.values()];
  await writeFile(OUT_FILE, JSON.stringify(addresses, null, 2) + '\n');
  console.log(`Saved ${addresses.length} addresses to ${OUT_FILE}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
