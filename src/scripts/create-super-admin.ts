import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function createSuperAdmin() {
    try {
        console.log('🔐 Creating SUPER_ADMIN user...');

        // Get SUPER_ADMIN role
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'SUPER_ADMIN' },
        });

        if (!superAdminRole) {
            throw new Error('SUPER_ADMIN role not found. Please run database seed first.');
        }

        // Check if a school exists (SUPER_ADMIN needs a schoolId)
        let school = await prisma.school.findFirst();

        if (!school) {
            console.log('📚 No school found. Creating a system school for SUPER_ADMIN...');
            school = await prisma.school.create({
                data: {
                    name: 'System School',
                    email: 'system@school.com',
                    isActive: true,
                },
            });
            console.log('✅ System school created');
        }

        // Get email and password from environment or use defaults
        const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@school.com';
        const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

        // Check if SUPER_ADMIN already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            console.log(`⚠️  User with email ${email} already exists. Skipping creation.`);
            return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create SUPER_ADMIN user
        const superAdmin = await prisma.user.create({
            data: {
                schoolId: school.id,
                roleId: superAdminRole.id,
                email,
                passwordHash,
                isActive: true,
            },
        });

        console.log('\n========================================');
        console.log('✅ SUPER_ADMIN CREATED SUCCESSFULLY!');
        console.log('========================================');
        console.log('📧 Email:    ', email);
        console.log('🔑 Password: ', password);
        console.log('========================================');
        console.log('⚠️  Please change the password after first login!');
        console.log('========================================\n');
    } catch (error) {
        console.error('❌ Error creating SUPER_ADMIN:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();




