import { Router, type IRouter } from "express";
import {
  GetVisibleObjectsResponse,
  GetSkyConditionsResponse,
  GetSolarSystemPositionsResponse,
  GetAstronomicalEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toRad(deg: number) { return deg * Math.PI / 180; }
function toDeg(rad: number) { return rad * 180 / Math.PI; }

function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function localSiderealTime(jd: number, lon: number): number {
  const T = (jd - 2451545.0) / 36525;
  let theta = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T * T * T / 38710000;
  theta = ((theta % 360) + 360) % 360;
  return (theta + lon + 360) % 360;
}

function equatorialToHorizontal(ra: number, dec: number, lst: number, lat: number) {
  const ha = ((lst - ra) % 360 + 360) % 360;
  const haRad = toRad(ha);
  const decRad = toRad(dec);
  const latRad = toRad(lat);
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));
  const cosAz = (Math.sin(decRad) - sinAlt * Math.sin(latRad)) / (Math.cos(toRad(altitude)) * Math.cos(latRad));
  let azimuth = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (Math.sin(haRad) > 0) azimuth = 360 - azimuth;
  return { altitude, azimuth };
}

function computeSunPosition(jd: number) {
  const n = jd - 2451545.0;
  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const g = toRad(((357.528 + 0.9856003 * n) % 360 + 360) % 360);
  const lambda = toRad(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const epsilon = toRad(23.439 - 0.0000004 * n);
  const ra = toDeg(Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)));
  const dec = toDeg(Math.asin(Math.sin(epsilon) * Math.sin(lambda)));
  return { ra: ((ra % 360) + 360) % 360, dec };
}

function computeMoonPosition(jd: number) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = ((218.316 + 13.176396 * (jd - 2451545)) % 360 + 360) % 360;
  const M = toRad(((134.963 + 13.064993 * (jd - 2451545)) % 360 + 360) % 360);
  const F = toRad(((93.272 + 13.229350 * (jd - 2451545)) % 360 + 360) % 360);
  const lambda = L0 + 6.289 * Math.sin(M);
  const beta = 5.128 * Math.sin(F);
  const epsilon = 23.439 - 0.0000004 * (jd - 2451545);
  const lambdaRad = toRad(lambda);
  const betaRad = toRad(beta);
  const epsilonRad = toRad(epsilon);
  const ra = toDeg(Math.atan2(Math.sin(lambdaRad) * Math.cos(epsilonRad) - Math.tan(betaRad) * Math.sin(epsilonRad), Math.cos(lambdaRad)));
  const dec = toDeg(Math.asin(Math.sin(betaRad) * Math.cos(epsilonRad) + Math.cos(betaRad) * Math.sin(epsilonRad) * Math.sin(lambdaRad)));
  const age = ((jd - 2451549.5) % 29.53059) + 29.53059 * ((jd - 2451549.5) % 29.53059 < 0 ? 1 : 0);
  const correctedAge = age < 0 ? age + 29.53059 : age;
  const illumination = 50 * (1 - Math.cos(2 * Math.PI * correctedAge / 29.53059));
  return { ra: ((ra % 360) + 360) % 360, dec, age: correctedAge, illumination };
}

type PlanetDef = {
  name: string;
  symbol: string;
  a: number; L0: number; Ldot: number; e: number; omega: number;
  i: number; Om: number; mag0: number; diameter: number;
};

const PLANET_ELEMENTS: PlanetDef[] = [
  { name: "Mercury", symbol: "☿", a: 0.387098, L0: 252.25032, Ldot: 4.092338, e: 0.205632, omega: 77.45779, i: 7.00487, Om: 48.33167, mag0: -0.0, diameter: 6.74 },
  { name: "Venus",   symbol: "♀", a: 0.723332, L0: 181.97973, Ldot: 1.602136, e: 0.006773, omega: 131.56377, i: 3.39471, Om: 76.68069, mag0: -4.0, diameter: 16.69 },
  { name: "Mars",    symbol: "♂", a: 1.523679, L0: 355.43300, Ldot: 0.524039, e: 0.093412, omega: 336.04084, i: 1.85061, Om: 49.57854, mag0: -1.52, diameter: 9.36 },
  { name: "Jupiter", symbol: "♃", a: 5.202561, L0: 34.33479,  Ldot: 0.083086, e: 0.048498, omega: 14.72847, i: 1.30530, Om: 100.55615, mag0: -9.25, diameter: 196.74 },
  { name: "Saturn",  symbol: "♄", a: 9.554747, L0: 50.07571,  Ldot: 0.033459, e: 0.055546, omega: 92.86136, i: 2.48446, Om: 113.71504, mag0: -8.88, diameter: 165.60 },
  { name: "Uranus",  symbol: "⛢", a: 19.19126, L0: 314.05500, Ldot: 0.011714, e: 0.047318, omega: 170.96424, i: 0.76986, Om: 74.22988, mag0: 5.68, diameter: 70.48 },
  { name: "Neptune", symbol: "♆", a: 30.06896, L0: 304.34878, Ldot: 0.005965, e: 0.008606, omega: 44.97135, i: 1.76917, Om: 131.72169, mag0: 7.78, diameter: 67.56 },
];

function computePlanetPosition(planet: PlanetDef, jd: number) {
  const T = (jd - 2451545.0) / 36525;
  const n = jd - 2451545.0;
  const M = toRad(((planet.L0 + planet.Ldot * n / 365.25 - planet.omega + 360) % 360 + 360) % 360);
  const E = solveKepler(M, planet.e);
  const xv = planet.a * (Math.cos(E) - planet.e);
  const yv = planet.a * Math.sqrt(1 - planet.e * planet.e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const omegaRad = toRad(planet.omega);
  const OmRad = toRad(planet.Om);
  const iRad = toRad(planet.i);
  const xecl = r * (Math.cos(OmRad) * Math.cos(v + omegaRad - OmRad) - Math.sin(OmRad) * Math.sin(v + omegaRad - OmRad) * Math.cos(iRad));
  const yecl = r * (Math.sin(OmRad) * Math.cos(v + omegaRad - OmRad) + Math.cos(OmRad) * Math.sin(v + omegaRad - OmRad) * Math.cos(iRad));
  const zecl = r * Math.sin(v + omegaRad - OmRad) * Math.sin(iRad);
  const epsilon = toRad(23.439 - 0.0000004 * n);
  const xeq = xecl;
  const yeq = yecl * Math.cos(epsilon) - zecl * Math.sin(epsilon);
  const zeq = yecl * Math.sin(epsilon) + zecl * Math.cos(epsilon);
  const ra = toDeg(Math.atan2(yeq, xeq));
  const dec = toDeg(Math.atan2(zeq, Math.sqrt(xeq * xeq + yeq * yeq)));
  const distance = Math.sqrt(xeq * xeq + yeq * yeq + zeq * zeq);
  const angularDiameter = planet.diameter / distance;
  return { ra: ((ra % 360) + 360) % 360, dec, distance, angularDiameter };
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

function computeRiseSetTransit(ra: number, dec: number, lat: number, lon: number, jd: number) {
  try {
    const lst0 = localSiderealTime(jd, lon);
    const latRad = toRad(lat);
    const decRad = toRad(dec);
    const cosH = (Math.sin(toRad(-0.5667)) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    if (cosH < -1 || cosH > 1) return { riseTime: null, setTime: null, transitTime: null };
    const H = toDeg(Math.acos(cosH));
    const transitHA = (ra - lst0 + 720) % 360;
    const transitFrac = transitHA / 360;
    const riseFrac = ((transitHA - H + 720) % 360) / 360;
    const setFrac = ((transitHA + H) % 360) / 360;
    const base = new Date((jd - 0.5 - 2440587.5) * 86400000);
    base.setHours(0, 0, 0, 0);
    const transit = new Date(base.getTime() + transitFrac * 86400000);
    const rise = new Date(base.getTime() + riseFrac * 86400000);
    const set = new Date(base.getTime() + setFrac * 86400000);
    return {
      riseTime: rise.toISOString(),
      setTime: set.toISOString(),
      transitTime: transit.toISOString(),
    };
  } catch {
    return { riseTime: null, setTime: null, transitTime: null };
  }
}

const BRIGHT_STARS = [
  { name: "Sirius", ra: 101.287, dec: -16.716, magnitude: -1.46, constellation: "Canis Major", description: "Brightest star in the night sky, 8.6 light-years away" },
  { name: "Canopus", ra: 95.988, dec: -52.696, magnitude: -0.74, constellation: "Carina", description: "Second brightest star, a supergiant 310 ly away" },
  { name: "Arcturus", ra: 213.915, dec: 19.182, magnitude: -0.05, constellation: "Boötes", description: "Brightest star in Boötes, an orange giant 37 ly away" },
  { name: "Vega", ra: 279.235, dec: 38.783, magnitude: 0.03, constellation: "Lyra", description: "Bright summer star, once Earth's north polar star" },
  { name: "Capella", ra: 79.172, dec: 45.998, magnitude: 0.08, constellation: "Auriga", description: "Brightest in Auriga, a binary star system 43 ly away" },
  { name: "Rigel", ra: 78.634, dec: -8.202, magnitude: 0.13, constellation: "Orion", description: "Blue supergiant marking Orion's left foot, 860 ly away" },
  { name: "Procyon", ra: 114.825, dec: 5.225, magnitude: 0.34, constellation: "Canis Minor", description: "Little Dog star, a binary system 11.5 ly away" },
  { name: "Betelgeuse", ra: 88.793, dec: 7.407, magnitude: 0.50, constellation: "Orion", description: "Red supergiant, one of the largest known stars, 700 ly away" },
  { name: "Altair", ra: 297.695, dec: 8.868, magnitude: 0.77, constellation: "Aquila", description: "Rapidly rotating star 17 ly away, part of Summer Triangle" },
  { name: "Aldebaran", ra: 68.980, dec: 16.509, magnitude: 0.85, constellation: "Taurus", description: "Red giant, eye of Taurus the Bull, 65 ly away" },
  { name: "Antares", ra: 247.352, dec: -26.432, magnitude: 1.06, constellation: "Scorpius", description: "Red supergiant heart of the Scorpion, 554 ly away" },
  { name: "Spica", ra: 201.298, dec: -11.161, magnitude: 1.04, constellation: "Virgo", description: "Brightest star in Virgo, a binary system 250 ly away" },
  { name: "Pollux", ra: 116.329, dec: 28.026, magnitude: 1.14, constellation: "Gemini", description: "Orange giant, nearest giant star at 34 ly" },
  { name: "Fomalhaut", ra: 344.413, dec: -29.622, magnitude: 1.16, constellation: "Piscis Austrinus", description: "Has a debris disk, possibly hosting planets, 25 ly away" },
  { name: "Deneb", ra: 310.358, dec: 45.280, magnitude: 1.25, constellation: "Cygnus", description: "Tail of the Swan, one of the most luminous stars known" },
  { name: "Regulus", ra: 152.093, dec: 11.967, magnitude: 1.35, constellation: "Leo", description: "Heart of Leo the Lion, a rapidly rotating star 79 ly away" },
  { name: "Castor", ra: 113.650, dec: 31.889, magnitude: 1.58, constellation: "Gemini", description: "A fascinating sextuple star system 52 ly away" },
  { name: "Bellatrix", ra: 81.283, dec: 6.350, magnitude: 1.64, constellation: "Orion", description: "Amazon Star, hot blue-white giant in Orion's shoulder" },
  { name: "Elnath", ra: 81.573, dec: 28.608, magnitude: 1.65, constellation: "Taurus", description: "Tip of one of Taurus's horns, a blue-white giant" },
  { name: "Miaplacidus", ra: 138.300, dec: -69.717, magnitude: 1.67, constellation: "Carina", description: "Second brightest star in Carina, a blue-white giant" },
];

const DEEP_SKY_OBJECTS = [
  { name: "Andromeda Galaxy (M31)", ra: 10.685, dec: 41.269, magnitude: 3.44, constellation: "Andromeda", type: "galaxy" as const, description: "Nearest major galaxy to the Milky Way, 2.5 million ly away" },
  { name: "Orion Nebula (M42)", ra: 83.822, dec: -5.391, magnitude: 4.0, constellation: "Orion", type: "nebula" as const, description: "Stellar nursery, one of the most studied objects in astronomy" },
  { name: "Pleiades (M45)", ra: 56.75, dec: 24.117, magnitude: 1.6, constellation: "Taurus", type: "cluster" as const, description: "The Seven Sisters, a young open star cluster 444 ly away" },
  { name: "Beehive Cluster (M44)", ra: 130.025, dec: 19.683, magnitude: 3.7, constellation: "Cancer", type: "cluster" as const, description: "Large nearby open cluster in Cancer, 577 ly away" },
  { name: "Omega Centauri (NGC 5139)", ra: 201.697, dec: -47.480, magnitude: 3.9, constellation: "Centaurus", type: "cluster" as const, description: "Largest globular cluster in the Milky Way" },
  { name: "Triangulum Galaxy (M33)", ra: 23.462, dec: 30.660, magnitude: 5.72, constellation: "Triangulum", type: "galaxy" as const, description: "Third largest galaxy in Local Group, 2.7 million ly" },
  { name: "Lagoon Nebula (M8)", ra: 270.920, dec: -24.383, magnitude: 6.0, constellation: "Sagittarius", type: "nebula" as const, description: "Active star-forming nebula in Sagittarius, 4000 ly away" },
  { name: "Hercules Cluster (M13)", ra: 250.423, dec: 36.461, magnitude: 5.8, constellation: "Hercules", type: "cluster" as const, description: "Great globular cluster, 300,000 stars in a tight ball" },
  { name: "Ring Nebula (M57)", ra: 283.396, dec: 33.029, magnitude: 8.8, constellation: "Lyra", type: "nebula" as const, description: "Classic planetary nebula, shell of gas from a dying star" },
  { name: "Whirlpool Galaxy (M51)", ra: 202.470, dec: 47.195, magnitude: 8.4, constellation: "Canes Venatici", type: "galaxy" as const, description: "Iconic face-on spiral galaxy with a companion dwarf galaxy" },
];

function getMoonPhase(illumination: number, age: number): string {
  if (age < 1.85) return "new";
  if (age < 7.38) return "waxing_crescent";
  if (age < 9.22) return "first_quarter";
  if (age < 14.77) return "waxing_gibbous";
  if (age < 16.61) return "full";
  if (age < 22.15) return "waning_gibbous";
  if (age < 23.99) return "last_quarter";
  if (age < 29.53) return "waning_crescent";
  return "new";
}

function formatSiderealTime(degrees: number): string {
  const hours = degrees / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getConstellationForRA(ra: number, dec: number): string {
  const epsilon = toRad(23.4393);
  const raRad = toRad(ra);
  const decRad = toRad(dec);
  const sinLambda = Math.sin(raRad) * Math.cos(epsilon) + Math.tan(decRad) * Math.sin(epsilon);
  let lambda = toDeg(Math.atan2(sinLambda, Math.cos(raRad)));
  lambda = ((lambda % 360) + 360) % 360;
  const sinBeta = Math.sin(decRad) * Math.cos(epsilon) - Math.cos(decRad) * Math.sin(epsilon) * Math.sin(raRad);
  const beta = toDeg(Math.asin(Math.max(-1, Math.min(1, sinBeta))));

  if (Math.abs(beta) <= 15) {
    if (lambda >= 351.7 || lambda < 28.7)  return "Pisces";
    if (lambda < 53.4)   return "Aries";
    if (lambda < 90.4)   return "Taurus";
    if (lambda < 118.2)  return "Gemini";
    if (lambda < 138.0)  return "Cancer";
    if (lambda < 173.9)  return "Leo";
    if (lambda < 218.0)  return "Virgo";
    if (lambda < 241.0)  return "Libra";
    if (lambda < 247.7)  return "Scorpius";
    if (lambda < 266.1)  return "Ophiuchus";
    if (lambda < 299.7)  return "Sagittarius";
    if (lambda < 327.6)  return "Capricornus";
    if (lambda < 351.7)  return "Aquarius";
  }

  const regions: Array<{ name: string; raMin: number; raMax: number; decMin: number; decMax: number }> = [
    // Northern circumpolar
    { name: "Ursa Minor",   raMin: 0,   raMax: 360, decMin: 65,  decMax: 90  },
    { name: "Cepheus",      raMin: 320, raMax: 360, decMin: 58,  decMax: 80  },
    { name: "Cepheus",      raMin: 0,   raMax: 50,  decMin: 58,  decMax: 80  },
    { name: "Cassiopeia",   raMin: 350, raMax: 360, decMin: 48,  decMax: 72  },
    { name: "Cassiopeia",   raMin: 0,   raMax: 35,  decMin: 48,  decMax: 72  },
    { name: "Draco",        raMin: 150, raMax: 320, decMin: 51,  decMax: 80  },
    { name: "Ursa Major",   raMin: 130, raMax: 210, decMin: 40,  decMax: 70  },
    { name: "Camelopardalis",raMin: 35, raMax: 150, decMin: 55,  decMax: 80  },
    // Northern
    { name: "Perseus",      raMin: 30,  raMax: 70,  decMin: 30,  decMax: 60  },
    { name: "Auriga",       raMin: 70,  raMax: 100, decMin: 28,  decMax: 55  },
    { name: "Lynx",         raMin: 100, raMax: 135, decMin: 32,  decMax: 58  },
    { name: "Canes Venatici",raMin: 185,raMax: 215, decMin: 28,  decMax: 55  },
    { name: "Coma Berenices",raMin: 175,raMax: 205, decMin: 13,  decMax: 32  },
    { name: "Corona Borealis",raMin:227,raMax: 247, decMin: 25,  decMax: 40  },
    { name: "Hercules",     raMin: 240, raMax: 275, decMin: 12,  decMax: 52  },
    { name: "Lyra",         raMin: 275, raMax: 295, decMin: 25,  decMax: 50  },
    { name: "Cygnus",       raMin: 290, raMax: 340, decMin: 27,  decMax: 62  },
    { name: "Lacerta",      raMin: 330, raMax: 355, decMin: 35,  decMax: 58  },
    { name: "Andromeda",    raMin: 355, raMax: 360, decMin: 21,  decMax: 52  },
    { name: "Andromeda",    raMin: 0,   raMax: 30,  decMin: 21,  decMax: 52  },
    { name: "Triangulum",   raMin: 25,  raMax: 40,  decMin: 25,  decMax: 38  },
    // Equatorial
    { name: "Orion",        raMin: 70,  raMax: 95,  decMin: -10, decMax: 22  },
    { name: "Gemini",       raMin: 92,  raMax: 120, decMin: 12,  decMax: 36  },
    { name: "Cancer",       raMin: 118, raMax: 138, decMin: 6,   decMax: 32  },
    { name: "Leo",          raMin: 138, raMax: 180, decMin: -5,  decMax: 35  },
    { name: "Virgo",        raMin: 180, raMax: 218, decMin: -22, decMax: 15  },
    { name: "Boötes",       raMin: 207, raMax: 240, decMin: 8,   decMax: 55  },
    { name: "Serpens",      raMin: 225, raMax: 250, decMin: -5,  decMax: 28  },
    { name: "Ophiuchus",    raMin: 245, raMax: 275, decMin: -30, decMax: 15  },
    { name: "Aquila",       raMin: 283, raMax: 305, decMin: -12, decMax: 20  },
    { name: "Delphinus",    raMin: 305, raMax: 315, decMin: 2,   decMax: 20  },
    { name: "Pegasus",      raMin: 330, raMax: 360, decMin: 4,   decMax: 35  },
    { name: "Pegasus",      raMin: 0,   raMax: 5,   decMin: 4,   decMax: 35  },
    // Southern
    { name: "Eridanus",     raMin: 20,  raMax: 80,  decMin: -60, decMax: -5  },
    { name: "Lepus",        raMin: 75,  raMax: 90,  decMin: -27, decMax: -10 },
    { name: "Canis Major",  raMin: 90,  raMax: 115, decMin: -35, decMax: -10 },
    { name: "Canis Minor",  raMin: 110, raMax: 125, decMin: -5,  decMax: 15  },
    { name: "Hydra",        raMin: 125, raMax: 220, decMin: -35, decMax: 5   },
    { name: "Corvus",       raMin: 180, raMax: 198, decMin: -25, decMax: -10 },
    { name: "Centaurus",    raMin: 188, raMax: 218, decMin: -65, decMax: -25 },
    { name: "Lupus",        raMin: 218, raMax: 245, decMin: -55, decMax: -25 },
    { name: "Scorpius",     raMin: 235, raMax: 265, decMin: -48, decMax: -5  },
    { name: "Sagittarius",  raMin: 265, raMax: 305, decMin: -45, decMax: -10 },
    { name: "Capricornus",  raMin: 298, raMax: 328, decMin: -28, decMax: -8  },
    { name: "Aquarius",     raMin: 315, raMax: 355, decMin: -30, decMax: 5   },
    { name: "Piscis Austrinus",raMin:335,raMax: 350,decMin: -36, decMax: -22 },
    { name: "Cetus",        raMin: 355, raMax: 360, decMin: -25, decMax: 10  },
    { name: "Cetus",        raMin: 0,   raMax: 45,  decMin: -25, decMax: 10  },
    { name: "Sculptor",     raMin: 345, raMax: 360, decMin: -40, decMax: -25 },
    { name: "Sculptor",     raMin: 0,   raMax: 25,  decMin: -40, decMax: -25 },
    { name: "Phoenix",      raMin: 355, raMax: 360, decMin: -58, decMax: -40 },
    { name: "Phoenix",      raMin: 0,   raMax: 30,  decMin: -58, decMax: -40 },
    // Zodiac fallback belt — ensures no planet slips through
    { name: "Pisces",       raMin: 345, raMax: 360, decMin: -10, decMax: 40  },
    { name: "Pisces",       raMin: 0,   raMax: 30,  decMin: -10, decMax: 40  },
    { name: "Aries",        raMin: 25,  raMax: 55,  decMin: -5,  decMax: 30  },
    { name: "Taurus",       raMin: 52,  raMax: 90,  decMin: 5,   decMax: 30  },
    { name: "Gemini",       raMin: 87,  raMax: 120, decMin: 10,  decMax: 36  },
    { name: "Leo",          raMin: 138, raMax: 175, decMin: -5,  decMax: 35  },
    { name: "Libra",        raMin: 215, raMax: 245, decMin: -30, decMax: 5   },
    { name: "Aquarius",     raMin: 305, raMax: 350, decMin: -25, decMax: 10  },
  ];

  for (const c of regions) {
    const inRA = c.raMin <= c.raMax
      ? ra >= c.raMin && ra <= c.raMax
      : ra >= c.raMin || ra <= c.raMax;
    if (inRA && dec >= c.decMin && dec <= c.decMax) return c.name;
  }

  if (lambda >= 351.7 || lambda < 28.7)  return "Pisces";
  if (lambda < 53.4)   return "Aries";
  if (lambda < 90.4)   return "Taurus";
  if (lambda < 118.2)  return "Gemini";
  if (lambda < 138.0)  return "Cancer";
  if (lambda < 173.9)  return "Leo";
  if (lambda < 218.0)  return "Virgo";
  if (lambda < 241.0)  return "Libra";
  if (lambda < 266.1)  return "Ophiuchus";
  if (lambda < 299.7)  return "Sagittarius";
  if (lambda < 327.6)  return "Capricornus";
  return "Aquarius";
}

router.get("/visible-objects", (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 40.7128;
  const lon = parseFloat(req.query.lon as string) || -74.006;
  const now = new Date();
  const jd = julianDate(now);
  const lst = localSiderealTime(jd, lon);
  const objects: any[] = [];

  for (const star of BRIGHT_STARS) {
    const { altitude, azimuth } = equatorialToHorizontal(star.ra, star.dec, lst, lat);
    const times = computeRiseSetTransit(star.ra, star.dec, lat, lon, jd);
    const haRad = toRad(((lst - star.ra) % 360 + 360) % 360);
    objects.push({
      name: star.name,
      type: "star",
      magnitude: star.magnitude,
      altitude: Math.round(altitude * 10) / 10,
      azimuth: Math.round(azimuth * 10) / 10,
      constellation: star.constellation,
      description: star.description,
      isVisible: altitude > 0,
      isRising: Math.sin(haRad) < 0,
      riseTime: times.riseTime,
      setTime: times.setTime,
      transitTime: times.transitTime,
      distanceAU: null,
    });
  }

  for (const dso of DEEP_SKY_OBJECTS) {
    const { altitude, azimuth } = equatorialToHorizontal(dso.ra, dso.dec, lst, lat);
    const times = computeRiseSetTransit(dso.ra, dso.dec, lat, lon, jd);
    const haRad = toRad(((lst - dso.ra) % 360 + 360) % 360);
    objects.push({
      name: dso.name,
      type: dso.type,
      magnitude: dso.magnitude,
      altitude: Math.round(altitude * 10) / 10,
      azimuth: Math.round(azimuth * 10) / 10,
      constellation: dso.constellation,
      description: dso.description,
      isVisible: altitude > 0,
      isRising: Math.sin(haRad) < 0,
      riseTime: times.riseTime,
      setTime: times.setTime,
      transitTime: times.transitTime,
      distanceAU: null,
    });
  }

  for (const planet of PLANET_ELEMENTS) {
    const pos = computePlanetPosition(planet, jd);
    const { altitude, azimuth } = equatorialToHorizontal(pos.ra, pos.dec, lst, lat);
    const times = computeRiseSetTransit(pos.ra, pos.dec, lat, lon, jd);
    const haRad = toRad(((lst - pos.ra) % 360 + 360) % 360);
    const sunDist = Math.sqrt(pos.distance * pos.distance + 1 - 2 * pos.distance * Math.cos(toRad(((lst - pos.ra) % 360 + 360) % 360)));
    const mag = isNaN(pos.distance) ? planet.mag0 : planet.mag0 + 5 * Math.log10(Math.max(0.001, pos.distance * Math.max(0.001, sunDist)));
    objects.push({
      name: planet.name,
      type: "planet",
      magnitude: Math.round(mag * 10) / 10,
      altitude: Math.round(altitude * 10) / 10,
      azimuth: Math.round(azimuth * 10) / 10,
      constellation: getConstellationForRA(pos.ra, pos.dec),
      description: `${planet.name}, ${planet.symbol}. Currently ${Math.round(pos.distance * 10) / 10} AU from Earth.`,
      isVisible: altitude > 0,
      isRising: Math.sin(haRad) < 0,
      riseTime: times.riseTime,
      setTime: times.setTime,
      transitTime: times.transitTime,
      distanceAU: Math.round(pos.distance * 100) / 100,
    });
  }

  objects.sort((a, b) => {
    if (a.isVisible !== b.isVisible) return a.isVisible ? -1 : 1;
    return a.magnitude - b.magnitude;
  });
  const data = GetVisibleObjectsResponse.parse({
    timestamp: now.toISOString(),
    lat,
    lon,
    objects,
    totalVisible: objects.filter(o => o.altitude > 0).length,
  });
  res.json(data);
});

router.get("/conditions", (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 40.7128;
  const lon = parseFloat(req.query.lon as string) || -74.006;
  const now = new Date();
  const jd = julianDate(now);
  const lst = localSiderealTime(jd, lon);

  const sun = computeSunPosition(jd);
  const { altitude: sunAlt } = equatorialToHorizontal(sun.ra, sun.dec, lst, lat);
  const moon = computeMoonPosition(jd);
  const { altitude: moonAlt, azimuth: moonAz } = equatorialToHorizontal(moon.ra, moon.dec, lst, lat);
  const moonTimes = computeRiseSetTransit(moon.ra, moon.dec, lat, lon, jd);
  const sunTimes = computeRiseSetTransit(sun.ra, sun.dec, lat, lon, jd);

  const isNight = sunAlt < -18;
  const astronomicalTwilight = sunAlt < -18;
  const nauticalTwilight = sunAlt < -12;
  const civilTwilight = sunAlt < -6;

  const moonIllum = moon.illumination;
  const phase = getMoonPhase(moonIllum, moon.age);

  const bortle = moonIllum > 80 ? 7 : moonIllum > 50 ? 6 : moonIllum > 25 ? 5 : isNight ? 4 : 8;
  const skyQuality = bortle <= 3 ? "excellent" : bortle <= 5 ? "good" : bortle <= 6 ? "fair" : "poor";

  const data = GetSkyConditionsResponse.parse({
    timestamp: now.toISOString(),
    lat,
    lon,
    moonPhase: {
      phase,
      illumination: Math.round(moonIllum * 10) / 10,
      age: Math.round(moon.age * 10) / 10,
      altitude: Math.round(moonAlt * 10) / 10,
      riseTime: moonTimes.riseTime,
      setTime: moonTimes.setTime,
    },
    bortle,
    skyQuality,
    sunAltitude: Math.round(sunAlt * 10) / 10,
    astronomicalTwilight,
    nauticalTwilight,
    civilTwilight,
    isNight,
    siderealTime: formatSiderealTime(lst),
    julianDate: Math.round(jd * 10000) / 10000,
    nextSunrise: sunTimes.riseTime,
    nextSunset: sunTimes.setTime,
  });
  res.json(data);
});

router.get("/solar-system", (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 40.7128;
  const lon = parseFloat(req.query.lon as string) || -74.006;
  const now = new Date();
  const jd = julianDate(now);
  const lst = localSiderealTime(jd, lon);

  const planetResults = PLANET_ELEMENTS.map(planet => {
    const pos = computePlanetPosition(planet, jd);
    const { altitude, azimuth } = equatorialToHorizontal(pos.ra, pos.dec, lst, lat);
    const times = computeRiseSetTransit(pos.ra, pos.dec, lat, lon, jd);
    const haRad = toRad(((lst - pos.ra) % 360 + 360) % 360);
    const sunDist2 = Math.sqrt(pos.distance * pos.distance + 1 - 2 * pos.distance * Math.cos(toRad(((lst - pos.ra) % 360 + 360) % 360)));
    const mag = planet.mag0 + 5 * Math.log10(Math.max(0.001, pos.distance * Math.max(0.001, sunDist2)));
    const phase = planet.name === "Mercury" || planet.name === "Venus"
      ? Math.round(50 * (1 + Math.cos(toRad(((lst - pos.ra) % 360 + 360) % 360))) * 10) / 10
      : null;
    return {
      name: planet.name,
      symbol: planet.symbol,
      altitude: Math.round(altitude * 10) / 10,
      azimuth: Math.round(azimuth * 10) / 10,
      magnitude: Math.round(mag * 10) / 10,
      angularDiameter: Math.round(pos.angularDiameter * 100) / 100,
      distanceAU: Math.round(pos.distance * 100) / 100,
      isVisible: altitude > 0,
      constellation: getConstellationForRA(pos.ra, pos.dec),
      riseTime: times.riseTime,
      setTime: times.setTime,
      transitTime: times.transitTime,
      phase,
    };
  });

  const sun = computeSunPosition(jd);
  const { altitude: sunAlt, azimuth: sunAz } = equatorialToHorizontal(sun.ra, sun.dec, lst, lat);
  const sunTimes = computeRiseSetTransit(sun.ra, sun.dec, lat, lon, jd);

  const moon = computeMoonPosition(jd);
  const { altitude: moonAlt, azimuth: moonAz } = equatorialToHorizontal(moon.ra, moon.dec, lst, lat);
  const moonTimes = computeRiseSetTransit(moon.ra, moon.dec, lat, lon, jd);

  const data = GetSolarSystemPositionsResponse.parse({
    timestamp: now.toISOString(),
    lat,
    lon,
    planets: planetResults,
    sun: {
      name: "Sun",
      symbol: "☀",
      altitude: Math.round(sunAlt * 10) / 10,
      azimuth: Math.round(sunAz * 10) / 10,
      magnitude: -26.74,
      angularDiameter: 1919.3,
      distanceAU: 1.0,
      isVisible: sunAlt > 0,
      constellation: getConstellationForRA(sun.ra, sun.dec),
      riseTime: sunTimes.riseTime,
      setTime: sunTimes.setTime,
      transitTime: sunTimes.transitTime,
      phase: null,
    },
    moon: {
      name: "Moon",
      symbol: "☽",
      altitude: Math.round(moonAlt * 10) / 10,
      azimuth: Math.round(moonAz * 10) / 10,
      magnitude: -12.6,
      angularDiameter: 1873,
      distanceAU: 0.00257,
      isVisible: moonAlt > 0,
      constellation: getConstellationForRA(moon.ra, moon.dec),
      riseTime: moonTimes.riseTime,
      setTime: moonTimes.setTime,
      transitTime: moonTimes.transitTime,
      phase: Math.round(moon.illumination * 10) / 10,
    },
  });
  res.json(data);
});

const NASA_IMAGE_IDS: Array<{ id: string; title: string }> = [
  { id: "carina_nebula",                title: "Carina Nebula (Webb)"           },
  { id: "PIA25433",                     title: "Eagle Nebula — WISE"             },
  { id: "PIA15658",                     title: "Helix Nebula (NGC 7293)"         },
  { id: "PIA04921",                     title: "Andromeda Galaxy"                },
  { id: "PIA03606",                     title: "Crab Nebula"                     },
  { id: "PIA15426",                     title: "Ring Nebula (Hubble)"            },
  { id: "PIA17563",                     title: "Star-Forming Region NGC 3603"    },
  { id: "PIA24579",                     title: "Godzilla Nebula (Spitzer)"       },
  { id: "GSFC_20171208_Archive_e001955",title: "Lagoon Nebula"                  },
  { id: "PIA25163",                     title: "Andromeda (Herschel/Planck)"     },
  { id: "30dor",                        title: "Tarantula Nebula Region"         },
  { id: "PIA25165",                     title: "Triangulum Galaxy"               },
];

router.get("/background", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const entry = NASA_IMAGE_IDS[Math.floor(Math.random() * NASA_IMAGE_IDS.length)];
  const url = `https://images-assets.nasa.gov/image/${entry.id}/${entry.id}~large.jpg`;

  res.json({ url, title: entry.title, date: "", explanation: "" });
});

router.get("/events", (_req, res) => {
  const now = new Date();
  const year = now.getFullYear();

  const events = [
    { name: "Lyrid Meteor Shower", type: "meteor_shower" as const, date: `${year}-04-22`, description: "Annual meteor shower from Comet Thatcher debris, up to 20 meteors/hr", peakIntensity: "20/hr", visibility: "northern_hemisphere" as const, magnitude: null },
    { name: "Eta Aquariid Meteor Shower", type: "meteor_shower" as const, date: `${year}-05-05`, description: "Debris from Halley's Comet, best in Southern Hemisphere, ~40/hr", peakIntensity: "40/hr", visibility: "global" as const, magnitude: null },
    { name: "Perseids Peak", type: "meteor_shower" as const, date: `${year}-08-12`, description: "Most popular meteor shower, debris from Comet Swift-Tuttle, up to 100/hr", peakIntensity: "100/hr", visibility: "northern_hemisphere" as const, magnitude: null },
    { name: "Leonid Meteor Shower", type: "meteor_shower" as const, date: `${year}-11-17`, description: "Swift meteors from Comet Tempel-Tuttle, known for occasional storms", peakIntensity: "15/hr", visibility: "global" as const, magnitude: null },
    { name: "Geminid Meteor Shower", type: "meteor_shower" as const, date: `${year}-12-13`, description: "Richest annual meteor shower, produced by asteroid 3200 Phaethon, 120/hr", peakIntensity: "120/hr", visibility: "global" as const, magnitude: null },
    { name: "Quadrantid Meteor Shower", type: "meteor_shower" as const, date: `${year + 1}-01-03`, description: "Brief but intense shower from asteroid 2003 EH1, peaks for just a few hours", peakIntensity: "120/hr", visibility: "northern_hemisphere" as const, magnitude: null },
    { name: "June Solstice", type: "solstice" as const, date: `${year}-06-21`, description: "Summer solstice in Northern Hemisphere, longest day of the year", peakIntensity: null, visibility: "global" as const, magnitude: null },
    { name: "December Solstice", type: "solstice" as const, date: `${year}-12-21`, description: "Winter solstice in Northern Hemisphere, shortest day of the year", peakIntensity: null, visibility: "global" as const, magnitude: null },
    { name: "March Equinox", type: "equinox" as const, date: `${year}-03-20`, description: "Vernal equinox, day and night are approximately equal in length", peakIntensity: null, visibility: "global" as const, magnitude: null },
    { name: "September Equinox", type: "equinox" as const, date: `${year}-09-22`, description: "Autumnal equinox, day and night are approximately equal in length", peakIntensity: null, visibility: "global" as const, magnitude: null },
    { name: "Jupiter Opposition", type: "opposition" as const, date: `${year}-11-03`, description: "Jupiter at its closest and brightest, rises at sunset and sets at sunrise", peakIntensity: null, visibility: "global" as const, magnitude: -2.9 },
    { name: "Saturn Opposition", type: "opposition" as const, date: `${year}-09-08`, description: "Saturn at its brightest, best time for ring viewing through telescope", peakIntensity: null, visibility: "global" as const, magnitude: 0.6 },
    { name: "Mars Opposition", type: "opposition" as const, date: `${year + 1}-01-16`, description: "Next Mars opposition, the red planet at its closest approach to Earth", peakIntensity: null, visibility: "global" as const, magnitude: -1.3 },
  ].filter(e => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 12);

  const data = GetAstronomicalEventsResponse.parse({
    events,
    generatedAt: now.toISOString(),
  });
  res.json(data);
});

export default router;
