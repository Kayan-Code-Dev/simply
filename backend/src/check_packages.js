import prisma from './prisma.js';

async function main() {
  const packages = await prisma.package.findMany({
    include: { university: true }
  });
  console.log('PACKAGES:');
  console.log(JSON.stringify(packages, null, 2));

  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { userPackages: true }
  });
  console.log('STUDENTS:');
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    packages: u.userPackages
  })), null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
