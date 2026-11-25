import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deviceId = 'ESP-32_Tracker';
  const apiToken = process.env.DEFAULT_DEVICE_TOKEN || 'cd_sim_181126_WSOLo6';

  console.log(`Seeding initial device: ${deviceId}...`);

  const device = await prisma.device.upsert({
    where: { deviceId },
    update: {
      apiToken,
      isActive: true,
    },
    create: {
      deviceId,
      name: 'ESP32 DevKit - NEO-7M Tracker',
      apiToken,
      isActive: true,
    },
  });

  console.log('Seeded device successfully:', device);
}

main()
  .catch((e) => {
    console.error('Error seeding device:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
