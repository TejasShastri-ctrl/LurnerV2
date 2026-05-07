import prisma from "../src/config/prisma.js";
import bcrypt from "bcryptjs";
import { generateFriendCode } from "../src/modules/social/social.service.js";

/**
 * Mutual Friend Seeder
 * Ensures every relationship created exists in both directions and handles friend codes.
 */
async function main() {
    console.log("🛠️ Seeding Mutual Social Relationships...");

    // 1. Ensure we have test users
    const userCount = await prisma.user.count();
    
    if (userCount < 3) {
        console.log("Creating test users...");
        const hashedPassword = await bcrypt.hash("password123", 10);
        
        const testUsers = [
            { name: "John Doe", email: "johndoe@mail.com", password: hashedPassword, friendCode: generateFriendCode() },
            { name: "Tejas", email: "tejas@mail.com", password: hashedPassword, friendCode: generateFriendCode() },
            { name: "TCS", email: "tcs@mail.com", password: hashedPassword, friendCode: generateFriendCode() },
        ];

        for (const user of testUsers) {
            await prisma.user.upsert({
                where: { email: user.email },
                update: {},
                create: user
            });
        }
    }

    const users = await prisma.user.findMany({ take: 3 });
    const [u1, u2, u3] = users;

    console.log(`Establishing links between: ${u1.name}, ${u2.name}, ${u3.name}`);

    // 2. Define Mutual Pairs
    const pairs = [
        [u1.id, u2.id],
        [u2.id, u3.id],
        [u1.id, u3.id]
    ];

    for (const [a, b] of pairs) {
        await prisma.$transaction([
            prisma.follows.upsert({
                where: { followerId_followingId: { followerId: a, followingId: b } },
                update: {},
                create: { followerId: a, followingId: b }
            }),
            prisma.follows.upsert({
                where: { followerId_followingId: { followerId: b, followingId: a } },
                update: {},
                create: { followerId: b, followingId: a }
            })
        ]);
        console.log(`✅ ${a} <---> ${b} are now mutual friends`);
    }

    console.log("\n🚀 Mutual Social Seeding Complete!");
    console.log("Test Accounts (Password: password123):");
    users.forEach(u => console.log(`- ${u.name}: ${u.email} [Code: ${u.friendCode}]`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
