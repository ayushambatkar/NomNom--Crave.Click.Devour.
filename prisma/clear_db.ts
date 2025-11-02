import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
    console.log("Clearing database...");
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.user.deleteMany();
    await prisma.address.deleteMany();
    console.log("Database cleared.");
}

clearDatabase();