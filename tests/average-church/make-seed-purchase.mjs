// v56 · the average church's sample purchase (DESIGN-PURCHASE.md §11): seed-followup.json + uChurch().caseBuys, written here (never by hand).
// Usage (repo root): node tests/average-church/make-seed-purchase.mjs   → tests/average-church/seed-purchase.json
// tests/buy-average-church.test.js runs it in memory and holds the file to it byte for byte (the fixture generator is never lost again).
// Made-up church, made-up options and prices: every store is "Store A/B/C (sample)", no links; the plan's ministries that need sound
// and video (the health fair, the 4-night series) are COMPUTED from the plan, never stored; the member with sound/video skill is the
// profile's skillCounts.av (1). The tests freeze the clock at 1 Oct 2026, 3 pm.
// The id is buy-avs001 (the design's sample said buy-avs01, five characters; the store's rule is buy- + six).
import fs from 'node:fs';
const DIR = new URL('./', import.meta.url);
const CID = 'sample-sampleton-sda';
const CASE_BUYS = {
 "v": 1,
 "items": {
  "buy-avs001": {
   "v": 1,
   "id": "buy-avs001",
   "sample": true,
   "created": 1790866800000,
   "updated": 1790866800000,
   "cat": "stream",
   "kind": "buy",
   "team": "media",
   "name": {
    "en": "Sound board and camera",
    "es": "Consola de sonido y cámara"
   },
   "need": {
    "en": "A new sound board and a camera so shut-ins can join the service",
    "es": "Una nueva consola de sonido y una cámara para que los miembros que no pueden salir de casa se unan al culto"
   },
   "why": [
    {
     "k": "shutins",
     "n": 9
    },
    {
     "k": "ministries"
    }
   ],
   "goal": {
    "en": "A sound board and a camera, so that members who cannot come can worship with us every Sabbath.",
    "es": "Una consola de sonido y una cámara, para que los miembros que no pueden venir adoren con nosotros cada sábado."
   },
   "names": [],
   "must": [
    {
     "en": "Audio from the mixer straight to the stream",
     "es": "Audio de la consola directo a la transmisión"
    },
    {
     "en": "A camera that moves by remote",
     "es": "Una cámara que se mueve a control remoto"
    }
   ],
   "options": [
    {
     "id": "a",
     "tier": "good",
     "src": "typed",
     "checked": "2026-10-01",
     "name": {
      "en": "12-channel mixer (USB) + 1080p camera",
      "es": "Consola de 12 canales (USB) + cámara 1080p"
     },
     "store": "Store A (sample)",
     "host": "",
     "url": "",
     "price": 1180,
     "extra": 0,
     "features": {
      "en": [
       "USB audio to the stream",
       "Fixed camera, manual zoom",
       "Simple for new volunteers"
      ],
      "es": [
       "Audio USB para la transmisión",
       "Cámara fija, zoom manual",
       "Sencilla para voluntarios nuevos"
      ]
     },
     "warranty": {
      "en": "1 year",
      "es": "1 año"
     },
     "install": {
      "how": "volunteers",
      "cost": 0
     },
     "running": {
      "what": {
       "en": "Song streaming license (yearly)",
       "es": "Licencia de transmisión de cantos (anual)"
      },
      "cost": null,
      "per": "year"
     }
    },
    {
     "id": "b",
     "tier": "better",
     "src": "typed",
     "checked": "2026-10-01",
     "name": {
      "en": "16-channel digital mixer + PTZ camera + encoder",
      "es": "Consola digital de 16 canales + cámara PTZ + codificador"
     },
     "store": "Store B (sample)",
     "host": "",
     "url": "",
     "price": 3150,
     "extra": 0,
     "features": {
      "en": [
       "Saved settings for each service",
       "Camera moves by remote",
       "Streams without a computer"
      ],
      "es": [
       "Ajustes guardados para cada culto",
       "La cámara se mueve a control remoto",
       "Transmite sin computadora"
      ]
     },
     "warranty": {
      "en": "2 years",
      "es": "2 años"
     },
     "install": {
      "how": "pro",
      "cost": 250,
      "note": {
       "en": "2 hours of a technician",
       "es": "2 horas de un técnico"
      }
     },
     "running": {
      "what": {
       "en": "Song streaming license (yearly)",
       "es": "Licencia de transmisión de cantos (anual)"
      },
      "cost": null,
      "per": "year"
     }
    },
    {
     "id": "c",
     "tier": "best",
     "src": "typed",
     "checked": "2026-10-01",
     "name": {
      "en": "24-channel mixer + two 4K PTZ cameras + switcher",
      "es": "Consola de 24 canales + dos cámaras PTZ 4K + mezclador de video"
     },
     "store": "Store C (sample)",
     "host": "",
     "url": "",
     "price": 7650,
     "extra": 0,
     "features": {
      "en": [
       "Two camera angles",
       "4K video",
       "Room to grow"
      ],
      "es": [
       "Dos ángulos de cámara",
       "Video 4K",
       "Espacio para crecer"
      ]
     },
     "warranty": {
      "en": "3 years",
      "es": "3 años"
     },
     "install": {
      "how": "pro",
      "cost": 1200
     },
     "running": {
      "what": {
       "en": "Song streaming license (yearly)",
       "es": "Licencia de transmisión de cantos (anual)"
      },
      "cost": null,
      "per": "year"
     }
    }
   ],
   "pick": "b",
   "pickWhy": null,
   "fund": {
    "lines": [
     {
      "k": "budget",
      "amount": 1000
     },
     {
      "k": "offering",
      "amount": 1200,
      "date": "2026-11-07"
     },
     {
      "k": "designated",
      "amount": 600
     },
     {
      "k": "match",
      "amount": 400,
      "note": {
       "en": "A member matches the offering up to $400 (sample)",
       "es": "Un miembro iguala la ofrenda hasta $400 (muestra)"
      }
     },
     {
      "k": "sell",
      "amount": 200,
      "note": {
       "en": "The old mixer",
       "es": "La consola anterior"
      }
     }
    ],
    "phases": null
   },
   "dates": {
    "finance": "2026-10-13",
    "board": "2026-10-20",
    "buyBy": "2026-11-15",
    "install": "2026-11-22",
    "firstUse": "2026-11-28",
    "report": "2026-12-15"
   },
   "path": [
    "finance",
    "board"
   ],
   "lastSearch": null
  }
 },
 "rules": {
  "v": 1,
  "businessAt": 10000,
  "confAt": null,
  "quotesAt": null,
  "sample": true
 }
};
export function makeSeedPurchase() {
  const F = JSON.parse(fs.readFileSync(new URL('seed-followup.json', DIR), 'utf8'));
  const out = JSON.parse(JSON.stringify(F));
  out._about = 'Terrain AVERAGE CHURCH fixture (PURCHASE, v56): seed-followup plus one project or purchase, a sound board and a camera for the livestream (uChurch().caseBuys: three options at sample prices from Store A/B/C (sample), the funding plan of $3,400 with a special offering in Sabbath worship on Sabbath 7 Nov 2026, the dates, the path Finance committee > Church board, and the church\'s business-meeting rule of $10,000 (sample)). Made by tests/average-church/make-seed-purchase.mjs (never by hand).';
  const ch = out['terrain-churches-v1'].churches[CID];
  if (!ch) throw new Error('no church ' + CID);
  ch.caseBuys = JSON.parse(JSON.stringify(CASE_BUYS));
  return JSON.stringify(out, null, 1) + '\n';
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  fs.writeFileSync(new URL('seed-purchase.json', DIR), makeSeedPurchase());
  console.log('wrote seed-purchase.json');
}
