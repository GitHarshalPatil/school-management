"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // ============================================
    // SEED ROLES
    // ============================================
    console.log('📋 Seeding Roles...');
    const roles = [
        {
            name: 'SUPER_ADMIN',
            description: 'Super administrator with system-wide access',
        },
        {
            name: 'SCHOOL_ADMIN',
            description: 'School administrator with full system access',
        },
        {
            name: 'TEACHER',
            description: 'Teacher with attendance marking and class management access',
        },
        {
            name: 'PARENT',
            description: 'Parent with read-only access to student information',
        },
    ];
    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {
                description: role.description,
            },
            create: role,
        });
        console.log(`  ✓ Role: ${role.name}`);
    }
    // ============================================
    // SEED BOARDS
    // ============================================
    console.log('📚 Seeding Boards...');
    const boards = [
        {
            name: 'CBSE',
            description: 'Central Board of Secondary Education',
        },
        {
            name: 'STATE',
            description: 'State Board of Education',
        },
        {
            name: 'ICSE',
            description: 'Indian Certificate of Secondary Education',
        },
        {
            name: 'GENERAL',
            description: 'General Education Board',
        },
    ];
    for (const board of boards) {
        await prisma.board.upsert({
            where: { name: board.name },
            update: {
                description: board.description,
            },
            create: board,
        });
        console.log(`  ✓ Board: ${board.name}`);
    }
    // ============================================
    // SEED STANDARDS
    // ============================================
    console.log('🎓 Seeding Standards...');
    const standards = [
        { name: 'Nursery', order: 0, description: 'Nursery / Pre-KG' },
        { name: 'LKG', order: 1, description: 'Lower Kindergarten' },
        { name: 'UKG', order: 2, description: 'Upper Kindergarten' },
        { name: '1st', order: 3, description: 'First Standard' },
        { name: '2nd', order: 4, description: 'Second Standard' },
        { name: '3rd', order: 5, description: 'Third Standard' },
        { name: '4th', order: 6, description: 'Fourth Standard' },
        { name: '5th', order: 7, description: 'Fifth Standard' },
        { name: '6th', order: 8, description: 'Sixth Standard' },
        { name: '7th', order: 9, description: 'Seventh Standard' },
        { name: '8th', order: 10, description: 'Eighth Standard' },
        { name: '9th', order: 11, description: 'Ninth Standard' },
        { name: '10th', order: 12, description: 'Tenth Standard' },
    ];
    for (const standard of standards) {
        await prisma.standard.upsert({
            where: { name: standard.name },
            update: {
                order: standard.order,
                description: standard.description,
            },
            create: standard,
        });
        console.log(`  ✓ Standard: ${standard.name} (Order: ${standard.order})`);
    }
    console.log('✅ Database seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map