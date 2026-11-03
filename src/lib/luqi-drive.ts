export const LUQI_DRIVE_REVIEWED_ON = "2 November 2026";
export const LUQI_DRIVE_CACHE_VERSION = 1;
export const LUQI_DRIVE_REPEAT_COOLDOWN_MS = 20 * 60 * 1000;

export type DriveStoryMode = "brief" | "standard" | "deep";
export type DriveRouteId = "n1-pretoria-polokwane" | "n3-joburg-durban";

export type DriveSource = {
  label: string;
  url: string;
  note: string;
};

export type DriveQuiz = {
  question: string;
  options: readonly string[];
  answerIndex: number;
  explanation: string;
};

export type DriveRoutePack = {
  id: DriveRouteId;
  title: string;
  corridor: string;
  provinces: readonly string[];
  businessProvince: string;
  businessQuery: string;
  brief: string;
  standard: string;
  deep: string;
  resourceTitle: string;
  resourceSummary: string;
  quiz: DriveQuiz;
  sources: readonly DriveSource[];
};

export const LUQI_DRIVE_ROUTE_PACKS: readonly DriveRoutePack[] = [
  {
    id: "n1-pretoria-polokwane",
    title: "Pretoria → Polokwane",
    corridor: "N1 North · Gauteng to Limpopo",
    provinces: ["GP", "LP"],
    businessProvince: "LP",
    businessQuery: "craft tourism food farm",
    brief:
      "The N1 is the direct northbound road from Gauteng to Polokwane. Luqi keeps this drive briefing short at highway speed and points you to original tourism sources before you make a stop.",
    standard:
      "South African Tourism identifies the N1 as the direct road from Johannesburg or Pretoria to Polokwane. Limpopo tourism highlights mountain, cultural and heritage destinations beyond the motorway, while Tswaing near northern Tshwane offers a geological heritage stop before a longer northbound trip.",
    deep:
      "Limpopo combines living culture, mountain landscapes and major heritage destinations. South African Tourism highlights Polokwane, Magoebaskloof and Mapungubwe among places worth exploring. DITSONG describes Tswaing Meteorite Crater near Soshanguve as a geological and community-tourism site. Luqi treats these as source-linked ideas, not proof that a venue is open today; confirm current hours and access with the original publisher before diverting.",
    resourceTitle: "From minerals to higher-value products",
    resourceSummary:
      "South Africa's mineral-beneficiation policy describes value addition as transforming mined raw material into more refined or manufactured products. Government also identifies platinum-group-metal fuel-cell components as one example of downstream value creation. This card is national economic context, not a claim that a particular mine or factory is directly beneath your vehicle.",
    quiz: {
      question: "What does mineral beneficiation mean in the official South African policy context?",
      options: [
        "Transforming mined raw material into more refined or higher-value products",
        "Exporting every mineral without further processing",
        "Using a GPS route to identify private mineral rights",
      ],
      answerIndex: 0,
      explanation:
        "The Department of Mineral and Petroleum Resources describes beneficiation as value-added processing that turns mined raw material into more refined and valuable products.",
    },
    sources: [
      {
        label: "South African Tourism · Limpopo mountains and N1 access",
        url: "https://www.southafrica.net/gl/en/travel/article/limpopo-s-mountains",
        note: "Tourism context and N1 access to Polokwane.",
      },
      {
        label: "DITSONG · Tswaing Meteorite Crater",
        url: "https://ditsong.org.za/en/our-museums/ditsong-tswaing-meteorite-crater/",
        note: "Official museum information for the geological heritage site.",
      },
      {
        label: "DMPR · Beneficiation Economics",
        url: "https://www.dmpr.gov.za/Branches/Mining-Minerals-Petroleum-Policy-Development/Operating-Mines/Beneficiation-Economics",
        note: "Official explanation of mineral beneficiation and value addition.",
      },
      {
        label: "South African Government · hydrogen and fuel cells",
        url: "https://www.gov.za/about-government/government-programmes/alternative-energy-solution",
        note: "Government context on platinum-group metals and fuel-cell value chains.",
      },
    ],
  },
  {
    id: "n3-joburg-durban",
    title: "Johannesburg → Durban",
    corridor: "N3 · Gauteng, Free State and KwaZulu-Natal",
    provinces: ["GP", "FS", "KZN"],
    businessProvince: "KZN",
    businessQuery: "craft food farm tourism",
    brief:
      "The N3 is the main road between Johannesburg and Durban. At highway speed Luqi gives only a short corridor story; detailed tourism and local-business exploration should wait until a passenger is handling the phone or the vehicle is stopped.",
    standard:
      "South African Tourism describes the Johannesburg-to-Durban N3 as a classic road-trip corridor and highlights KwaZulu-Natal's Drakensberg, battlefields, towns, food and cultural attractions. Luqi links you to the original tourism publisher instead of copying a live itinerary.",
    deep:
      "The N3 crosses changing landscapes on the way to Durban. South African Tourism recommends treating the drive as more than a transfer: Harrismith and the Drakensberg turn-offs open access to mountain areas, while KwaZulu-Natal tourism highlights heritage, food, nature and coastal experiences. Farm stalls and local producers can be valuable stops, but Luqi only recommends published Business Connect profiles or original tourism sources rather than inventing a business rating.",
    resourceTitle: "Value chains, not just raw extraction",
    resourceSummary:
      "South Africa's current critical-minerals strategy emphasises moving beyond extraction toward refining, processing, advanced materials and downstream manufacturing. Luqi presents that as economic-learning context rather than investment advice or a claim about a specific roadside site.",
    quiz: {
      question: "Which national road is the main Johannesburg-to-Durban corridor highlighted by South African Tourism?",
      options: ["N1", "N2", "N3"],
      answerIndex: 2,
      explanation:
        "South African Tourism identifies the N3 as the main road linking Johannesburg and Durban.",
    },
    sources: [
      {
        label: "South African Tourism · Joburg to Durban road trip",
        url: "https://www.southafrica.net/za/en/travel/article/the-funtastic-guide-to-road-tripping-from-joburg-to-durban",
        note: "Official tourism road-trip context for the N3 corridor.",
      },
      {
        label: "South African Tourism · KwaZulu-Natal attractions",
        url: "https://www.southafrica.net/gl/en/travel/article/kwazulu-natal-attractions",
        note: "Official tourism overview covering Drakensberg, heritage and coastal attractions.",
      },
      {
        label: "DMPR · Beneficiation Economics",
        url: "https://www.dmpr.gov.za/Branches/Mining-Minerals-Petroleum-Policy-Development/Operating-Mines/Beneficiation-Economics",
        note: "Official explanation of mineral beneficiation and value addition.",
      },
      {
        label: "South African Government · Critical Minerals Strategy",
        url: "https://www.gov.za/sites/default/files/gcis_document/202505/critical-minerals-and-metals-strategy-south-africa-2025.pdf",
        note: "Official national strategy for critical-mineral value chains.",
      },
    ],
  },
] as const;

export function driveStoryMode(speedKmh: number | null): DriveStoryMode {
  if (typeof speedKmh !== "number" || !Number.isFinite(speedKmh) || speedKmh < 0) return "standard";
  if (speedKmh >= 80) return "brief";
  if (speedKmh < 30) return "deep";
  return "standard";
}

export function driveStory(pack: DriveRoutePack, speedKmh: number | null): string {
  const mode = driveStoryMode(speedKmh);
  return mode === "brief" ? pack.brief : mode === "deep" ? pack.deep : pack.standard;
}

export function businessDirectoryLink(pack: DriveRoutePack): string {
  const params = new URLSearchParams({ province: pack.businessProvince, q: pack.businessQuery });
  return "/businesses?" + params.toString();
}

export function geohash6(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("INVALID_LATITUDE");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("INVALID_LONGITUDE");
  const alphabet = "0123456789bcdefghjkmnpqrstuvwxyz";
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
  let even = true, bit = 0, value = 0, hash = "";
  while (hash.length < 6) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) { value = (value << 1) | 1; lonMin = mid; } else { value <<= 1; lonMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) { value = (value << 1) | 1; latMin = mid; } else { value <<= 1; latMax = mid; }
    }
    even = !even;
    bit += 1;
    if (bit === 5) {
      hash += alphabet[value]!;
      bit = 0;
      value = 0;
    }
  }
  return hash;
}

type CachedDrivePack = {
  cacheVersion: number;
  savedAt: string;
  pack: DriveRoutePack;
};

const DB_NAME = "luqi-drive-public";
const STORE_NAME = "route-packs";

function openDriveDb(): Promise<IDBDatabase> {
  const factory = globalThis.indexedDB;
  if (!factory) return Promise.reject(new Error("OFFLINE_CACHE_UNAVAILABLE"));
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("OFFLINE_CACHE_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("OFFLINE_CACHE_BLOCKED"));
  });
}

export async function cacheDriveRoutePack(pack: DriveRoutePack): Promise<void> {
  const db = await openDriveDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const payload: CachedDrivePack = {
        cacheVersion: LUQI_DRIVE_CACHE_VERSION,
        savedAt: new Date().toISOString(),
        pack,
      };
      tx.objectStore(STORE_NAME).put(payload, pack.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("OFFLINE_CACHE_WRITE_FAILED"));
      tx.onabort = () => reject(new Error("OFFLINE_CACHE_WRITE_ABORTED"));
    });
  } finally {
    db.close();
  }
}

export async function hasCachedDriveRoutePack(id: DriveRouteId): Promise<boolean> {
  if (!globalThis.indexedDB) return false;
  const db = await openDriveDb();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => {
        const value = request.result as CachedDrivePack | undefined;
        resolve(!!value && value.cacheVersion === LUQI_DRIVE_CACHE_VERSION && value.pack?.id === id);
      };
      request.onerror = () => reject(new Error("OFFLINE_CACHE_READ_FAILED"));
    });
  } finally {
    db.close();
  }
}

export function shouldSuppressRepeat(lastPlayedAt: number | undefined, now = Date.now()): boolean {
  return typeof lastPlayedAt === "number" && now >= lastPlayedAt && now - lastPlayedAt < LUQI_DRIVE_REPEAT_COOLDOWN_MS;
}
