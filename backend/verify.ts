import { prisma } from './src/lib/prisma';

const LOCAL_IP = '10.5.48.166';
const PORT = 5000;
const BASE_URL_LOCAL = `http://${LOCAL_IP}:${PORT}`;
const BASE_URL_LOOP = `http://localhost:${PORT}`;
const API_KEY = 'cd_sim_181126_WSOLo6';
const DEVICE_ID = 'ESP-32_Tracker';

async function runVerification() {
  console.log('=================================================================');
  console.log('  RUNNING FULL ESP32 BACKEND VERIFICATION & COMPLIANCE TEST');
  console.log('=================================================================\n');

  const report: Record<string, any> = {};

  // Check 0: LAN IP Access
  try {
    const res = await fetch(`${BASE_URL_LOCAL}/health`);
    const data = await res.json();
    report['LAN_IP_ACCESS'] = {
      pass: res.status === 200 && data.status === 'healthy',
      urlTested: `${BASE_URL_LOCAL}/health`,
      response: data,
    };
  } catch (err: any) {
    report['LAN_IP_ACCESS'] = { pass: false, error: err.message };
  }

  // 1. Successful GPS Telemetry Submission
  try {
    const telemetryPacket = {
      deviceId: DEVICE_ID,
      latitude: 12.9730,
      longitude: 77.5960,
      altitude: 924.2,
      speed: 18.5,
      heading: 195.0,
      satellites: 11,
      hdop: 0.9,
      gpsTimestamp: new Date().toISOString(),
    };

    const res = await fetch(`${BASE_URL_LOCAL}/api/v1/tracking/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(telemetryPacket),
    });
    const data = await res.json();
    report['1_SUCCESSFUL_TELEMETRY_SUBMISSION'] = {
      pass: res.status === 201 && data.success === true && data.data.latitude === 12.973,
      statusCode: res.status,
      response: data,
    };
  } catch (err: any) {
    report['1_SUCCESSFUL_TELEMETRY_SUBMISSION'] = { pass: false, error: err.message };
  }

  // 2. Missing Authentication Token
  try {
    const res = await fetch(`${BASE_URL_LOOP}/api/v1/tracking/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        latitude: 12.9730,
        longitude: 77.5960,
        gpsTimestamp: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    report['2_MISSING_AUTH_TOKEN'] = {
      pass: res.status === 401 && data.success === false,
      statusCode: res.status,
      response: data,
    };
  } catch (err: any) {
    report['2_MISSING_AUTH_TOKEN'] = { pass: false, error: err.message };
  }

  // 3. Invalid Authentication Token
  try {
    const res = await fetch(`${BASE_URL_LOOP}/api/v1/tracking/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'completely_invalid_key_xyz',
      },
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        latitude: 12.9730,
        longitude: 77.5960,
        gpsTimestamp: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    report['3_INVALID_AUTH_TOKEN'] = {
      pass: res.status === 403 && data.success === false,
      statusCode: res.status,
      response: data,
    };
  } catch (err: any) {
    report['3_INVALID_AUTH_TOKEN'] = { pass: false, error: err.message };
  }

  // 4. Invalid Latitude and Longitude
  const invalidCases = [
    { name: 'Latitude > 90 (95.0)', payload: { deviceId: DEVICE_ID, latitude: 95.0, longitude: 77.596, gpsTimestamp: new Date().toISOString() } },
    { name: 'Latitude < -90 (-95.0)', payload: { deviceId: DEVICE_ID, latitude: -95.0, longitude: 77.596, gpsTimestamp: new Date().toISOString() } },
    { name: 'Longitude > 180 (185.0)', payload: { deviceId: DEVICE_ID, latitude: 12.973, longitude: 185.0, gpsTimestamp: new Date().toISOString() } },
    { name: 'Longitude < -180 (-185.0)', payload: { deviceId: DEVICE_ID, latitude: 12.973, longitude: -185.0, gpsTimestamp: new Date().toISOString() } },
    { name: 'Null Island / No Fix (0.0, 0.0)', payload: { deviceId: DEVICE_ID, latitude: 0.0, longitude: 0.0, gpsTimestamp: new Date().toISOString() } },
  ];

  const invalidCoordsResults: any[] = [];
  let allInvalidRejected = true;

  for (const c of invalidCases) {
    const res = await fetch(`${BASE_URL_LOOP}/api/v1/tracking/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(c.payload),
    });
    const data = await res.json();
    const passed = res.status === 400 && data.success === false;
    if (!passed) allInvalidRejected = false;
    invalidCoordsResults.push({ case: c.name, statusCode: res.status, passed, error: data.error, details: data.details });
  }

  report['4_INVALID_LAT_LON'] = {
    pass: allInvalidRejected,
    testCases: invalidCoordsResults,
  };

  // 5. Missing Required Fields
  const missingFieldCases = [
    { name: 'Missing latitude', payload: { deviceId: DEVICE_ID, longitude: 77.596, gpsTimestamp: new Date().toISOString() } },
    { name: 'Missing longitude', payload: { deviceId: DEVICE_ID, latitude: 12.973, gpsTimestamp: new Date().toISOString() } },
    { name: 'Missing deviceId', payload: { latitude: 12.973, longitude: 77.596, gpsTimestamp: new Date().toISOString() } },
    { name: 'Missing gpsTimestamp', payload: { deviceId: DEVICE_ID, latitude: 12.973, longitude: 77.596 } },
  ];

  const missingResults: any[] = [];
  let allMissingRejected = true;

  for (const c of missingFieldCases) {
    const res = await fetch(`${BASE_URL_LOOP}/api/v1/tracking/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(c.payload),
    });
    const data = await res.json();
    const passed = res.status === 400 && data.success === false;
    if (!passed) allMissingRejected = false;
    missingResults.push({ case: c.name, statusCode: res.status, passed, details: data.details });
  }

  report['5_MISSING_REQUIRED_FIELDS'] = {
    pass: allMissingRejected,
    testCases: missingResults,
  };

  // 6. Latest GPS Location Retrieval
  try {
    const res = await fetch(`${BASE_URL_LOCAL}/api/v1/tracking/devices/${DEVICE_ID}/latest`);
    const data = await res.json();
    report['6_LATEST_LOCATION_RETRIEVAL'] = {
      pass: res.status === 200 && data.success === true && data.data.latitude === 12.9730 && typeof data.data.ageSeconds === 'number',
      statusCode: res.status,
      response: data,
    };
  } catch (err: any) {
    report['6_LATEST_LOCATION_RETRIEVAL'] = { pass: false, error: err.message };
  }

  // 7. GPS History Retrieval
  try {
    const res = await fetch(`${BASE_URL_LOCAL}/api/v1/tracking/devices/${DEVICE_ID}/history?limit=10&order=desc`);
    const data = await res.json();
    report['7_GPS_HISTORY_RETRIEVAL'] = {
      pass: res.status === 200 && data.success === true && Array.isArray(data.data) && data.data.length > 0,
      statusCode: res.status,
      totalCount: data.pagination.total,
      returnedCount: data.data.length,
      sampleLatestPoint: data.data[0],
    };
  } catch (err: any) {
    report['7_GPS_HISTORY_RETRIEVAL'] = { pass: false, error: err.message };
  }

  // 8. Device Status Retrieval
  try {
    const res = await fetch(`${BASE_URL_LOCAL}/api/v1/tracking/devices/${DEVICE_ID}/status`);
    const data = await res.json();
    report['8_DEVICE_STATUS_RETRIEVAL'] = {
      pass: res.status === 200 && data.success === true && data.data.isOnline === true && data.data.fixQuality.rating === 'Ideal',
      statusCode: res.status,
      response: data,
    };
  } catch (err: any) {
    report['8_DEVICE_STATUS_RETRIEVAL'] = { pass: false, error: err.message };
  }

  // 9. Database Persistence Verification
  try {
    const dbTelemetryCount = await prisma.telemetry.count({
      where: { deviceId: DEVICE_ID },
    });
    const dbLatest = await prisma.telemetry.findFirst({
      where: { deviceId: DEVICE_ID },
      orderBy: { id: 'desc' },
    });
    const dbDevice = await prisma.device.findUnique({
      where: { deviceId: DEVICE_ID },
    });

    report['9_DATABASE_PERSISTENCE'] = {
      pass: dbTelemetryCount > 0 && dbLatest !== null && dbDevice?.lastSeen !== null,
      totalPersistedRecords: dbTelemetryCount,
      latestPersistedRecord: dbLatest,
      deviceLastSeenInDb: dbDevice?.lastSeen,
    };
  } catch (err: any) {
    report['9_DATABASE_PERSISTENCE'] = { pass: false, error: err.message };
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify(report, null, 2));
}

runVerification().catch(console.error);
