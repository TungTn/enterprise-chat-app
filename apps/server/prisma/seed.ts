import { PrismaClient, UserRole, PresenceStatus, ChannelScope, ChannelMemberRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise Chat Seeder...');

  // 1. Create Departments
  const deptExecutive = await prisma.department.upsert({
    where: { name: 'Ban Giám Đốc (Executive)' },
    update: {},
    create: {
      name: 'Ban Giám Đốc (Executive)',
      description: 'Lãnh đạo và quản lý chiến lược công ty',
    },
  });

  const deptEngineering = await prisma.department.upsert({
    where: { name: 'Khối Công Nghệ & Kỹ Thuật (Engineering)' },
    update: {},
    create: {
      name: 'Khối Công Nghệ & Kỹ Thuật (Engineering)',
      description: 'Phát triển phần mềm, hạ tầng kỹ thuật và giải pháp AI',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { name: 'Phòng Nhân Sự (HR)' },
    update: {},
    create: {
      name: 'Phòng Nhân Sự (HR)',
      description: 'Quản trị nhân sự, tuyển dụng và văn hóa doanh nghiệp',
    },
  });

  const deptSales = await prisma.department.upsert({
    where: { name: 'Phòng Kinh Doanh (Sales & Marketing)' },
    update: {},
    create: {
      name: 'Phòng Kinh Doanh (Sales & Marketing)',
      description: 'Tăng trưởng doanh thu và chăm sóc khách hàng doanh nghiệp',
    },
  });

  console.log('✅ Created Departments');

  // 2. Create Users
  const defaultPassword = await bcrypt.hash('Company@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      fullName: 'Nguyễn Văn Quản Trị (Admin)',
      passwordHash: defaultPassword,
      role: UserRole.SUPER_ADMIN,
      status: PresenceStatus.ONLINE,
      statusMessage: 'Sẵn sàng hỗ trợ 24/7',
      departmentId: deptExecutive.id,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
    },
  });

  const techLead = await prisma.user.upsert({
    where: { email: 'lead.tech@company.com' },
    update: {},
    create: {
      email: 'lead.tech@company.com',
      fullName: 'Trần Trọng Kỹ Thuật (Tech Lead)',
      passwordHash: defaultPassword,
      role: UserRole.DEPARTMENT_MANAGER,
      status: PresenceStatus.ONLINE,
      statusMessage: 'Đang review PR',
      departmentId: deptEngineering.id,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=techlead',
    },
  });

  const developer = await prisma.user.upsert({
    where: { email: 'developer@company.com' },
    update: {},
    create: {
      email: 'developer@company.com',
      fullName: 'Lê Hoàng Lập Trình (Senior Dev)',
      passwordHash: defaultPassword,
      role: UserRole.EMPLOYEE,
      status: PresenceStatus.ONLINE,
      statusMessage: 'Coding in progress...',
      departmentId: deptEngineering.id,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=dev',
    },
  });

  const hrMember = await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: {},
    create: {
      email: 'hr@company.com',
      fullName: 'Phạm Thị Nhân Sự (HR Specialist)',
      passwordHash: defaultPassword,
      role: UserRole.EMPLOYEE,
      status: PresenceStatus.AWAY,
      statusMessage: 'Phỏng vấn ứng viên',
      departmentId: deptHR.id,
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=hr',
    },
  });

  console.log('✅ Created Demo Users (Password: Company@123)');

  // 3. Create Channels
  const chAnnouncements = await prisma.conversation.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000001',
      type: 'CHANNEL',
      name: 'thong-bao-cong-ty',
      scope: ChannelScope.COMPANY,
      description: 'Kênh phát ngôn và thông báo chính thức từ Ban Lãnh Đạo',
      createdById: admin.id,
      members: {
        create: [
          { userId: admin.id, role: ChannelMemberRole.OWNER },
          { userId: techLead.id, role: ChannelMemberRole.MEMBER },
          { userId: developer.id, role: ChannelMemberRole.MEMBER },
          { userId: hrMember.id, role: ChannelMemberRole.MEMBER },
        ],
      },
      messages: {
        create: [
          {
            senderId: admin.id,
            content: 'Chào mừng toàn thể cán bộ nhân viên đến với nền tảng Chat Nội Bộ Doanh Nghiệp mới! 🎉',
          },
        ],
      },
    },
  });

  const chGeneral = await prisma.conversation.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000002',
      type: 'CHANNEL',
      name: 'goc-tra-da',
      scope: ChannelScope.COMPANY,
      description: 'Giao lưu, trò chuyện tự do ngoài giờ làm việc',
      createdById: hrMember.id,
      members: {
        create: [
          { userId: admin.id, role: ChannelMemberRole.MEMBER },
          { userId: techLead.id, role: ChannelMemberRole.MEMBER },
          { userId: developer.id, role: ChannelMemberRole.MEMBER },
          { userId: hrMember.id, role: ChannelMemberRole.OWNER },
        ],
      },
      messages: {
        create: [
          {
            senderId: hrMember.id,
            content: 'Chiều nay 16h30 có tiệc sinh nhật tháng tại Pantry tầng 5 nhé cả nhà! 🎂',
          },
        ],
      },
    },
  });

  const chEngineering = await prisma.conversation.upsert({
    where: { id: 'c0000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: 'c0000000-0000-0000-0000-000000000003',
      type: 'CHANNEL',
      name: 'engineering-core',
      scope: ChannelScope.DEPARTMENT,
      departmentId: deptEngineering.id,
      description: 'Thảo luận kỹ thuật, kiến trúc hệ thống và release sprint',
      createdById: techLead.id,
      members: {
        create: [
          { userId: techLead.id, role: ChannelMemberRole.OWNER },
          { userId: developer.id, role: ChannelMemberRole.ADMIN },
        ],
      },
      messages: {
        create: [
          {
            senderId: techLead.id,
            content: 'Sprint 24 mục tiêu deploy bản beta Enterprise Chat App lên staging nhé.',
          },
          {
            senderId: developer.id,
            content: 'Đã hoàn thành module Socket.io và xác thực JWT, đang hoàn thiện UI Desktop!',
          },
        ],
      },
    },
  });

  console.log('✅ Created Initial Company Channels with Welcome Messages');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
