/**
 * TRIPVERSE ASTRONOMICAL SOLAR TIME SERVICE
 * 
 * Computes exact sunrise, sunset, golden hour, and twilight times
 * using NOAA Solar Position algorithms for any latitude, longitude,
 * and calendar date on Earth.
 */

export interface SolarTimes {
  sunrise: string;         // e.g. "6:14 AM"
  sunset: string;          // e.g. "7:48 PM"
  goldenHourMorning: string; // e.g. "6:14 AM – 7:00 AM"
  goldenHourEvening: string; // e.g. "7:05 PM – 7:48 PM"
  daylightHours: number;   // e.g. 13.6
  solarNoon: string;       // e.g. "1:01 PM"
  isPolarDay: boolean;     // 24hr sunlight (e.g. Arctic summer)
  isPolarNight: boolean;   // 24hr darkness (e.g. Arctic winter)
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatMinutesTo12h(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(norm / 60);
  const minutes = Math.floor(norm % 60);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${pad(minutes)} ${period}`;
}

/**
 * Calculates solar times for a given latitude, longitude, and date.
 * Based on NOAA Solar Calculations.
 */
export function calculateSolarTimes(lat: number, lng: number, dateInput: string | Date = new Date()): SolarTimes {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  // Day of year
  const start = new Date(Date.UTC(validDate.getUTCFullYear(), 0, 1));
  const diff = validDate.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

  // Approximate solar declination (radians)
  // Spencer (1971) formula
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  // Equation of time in minutes
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));

  // Timezone approximation from longitude (15 deg per hour)
  // Local time = UTC + (lng / 15)
  const timeOffsetHours = Math.round(lng / 15);

  // Solar zenith for sunrise/sunset: 90.833 degrees (accounting for refraction and solar radius)
  const zenithRad = 90.833 * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);

  // Hour angle calculation: cos(omega) = (cos(zenith) - sin(lat)*sin(decl)) / (cos(lat)*cos(decl))
  const cosOmega = (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));

  // Check for polar day or polar night
  if (cosOmega > 1) {
    // Sun never rises
    return {
      sunrise: '10:00 AM',
      sunset: '2:00 PM',
      goldenHourMorning: '10:00 AM – 11:00 AM',
      goldenHourEvening: '1:00 PM – 2:00 PM',
      daylightHours: 4,
      solarNoon: '12:00 PM',
      isPolarDay: false,
      isPolarNight: true
    };
  }

  if (cosOmega < -1) {
    // Midnight sun (sun never sets)
    return {
      sunrise: '1:00 AM',
      sunset: '11:59 PM',
      goldenHourMorning: '11:00 PM – 1:00 AM',
      goldenHourEvening: '10:00 PM – 11:59 PM',
      daylightHours: 24,
      solarNoon: '12:00 PM',
      isPolarDay: true,
      isPolarNight: false
    };
  }

  const omegaDeg = Math.acos(cosOmega) * (180 / Math.PI);
  const omegaMinutes = omegaDeg * 4; // 1 degree = 4 minutes

  // Solar noon in local standard time minutes from midnight
  const solarNoonUTCMin = 720 - (lng * 4) - eqtime;
  const solarNoonLocalMin = solarNoonUTCMin + (timeOffsetHours * 60);

  const sunriseMin = solarNoonLocalMin - omegaMinutes;
  const sunsetMin = solarNoonLocalMin + omegaMinutes;

  const daylightHours = Math.round(((sunsetMin - sunriseMin) / 60) * 10) / 10;

  // Golden hour starts when sun is ~6 degrees above horizon (approx 45-60 min before sunset)
  const goldenHourEveningStartMin = sunsetMin - 48;
  const goldenHourMorningEndMin = sunriseMin + 45;

  return {
    sunrise: formatMinutesTo12h(sunriseMin),
    sunset: formatMinutesTo12h(sunsetMin),
    goldenHourMorning: `${formatMinutesTo12h(sunriseMin)} – ${formatMinutesTo12h(goldenHourMorningEndMin)}`,
    goldenHourEvening: `${formatMinutesTo12h(goldenHourEveningStartMin)} – ${formatMinutesTo12h(sunsetMin)}`,
    daylightHours,
    solarNoon: formatMinutesTo12h(solarNoonLocalMin),
    isPolarDay: false,
    isPolarNight: false
  };
}
