// prisma/seeds/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed with Event Sourcing...');

  // ============================================
  // LIMPAR DADOS EXISTENTES
  // ============================================
  console.log('🧹 Cleaning existing data...');

  await prisma.attendanceProjection.deleteMany();
  await prisma.revenueProjection.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.beltRank.deleteMany();
  await prisma.academyMartialArt.deleteMany();
  await prisma.academyUser.deleteMany();
  await prisma.martialArt.deleteMany();
  await prisma.academy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.snapshot.deleteMany();
  await prisma.event.deleteMany();

  console.log('✅ Database cleaned');

  // ============================================
  // USERS
  // ============================================
  console.log('👥 Creating users...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@academy.com',
      name: 'John Owner',
      password: hashedPassword,
      phone: '+5511999999999',
    },
  });

  const instructor = await prisma.user.create({
    data: {
      email: 'instructor@academy.com',
      name: 'Carlos Instructor',
      password: hashedPassword,
      phone: '+5511988888888',
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'member1@example.com',
      name: 'Alice Member',
      password: hashedPassword,
      phone: '+5511977777777',
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: 'member2@example.com',
      name: 'Bob Fighter',
      password: hashedPassword,
      phone: '+5511966666666',
    },
  });

  const member3 = await prisma.user.create({
    data: {
      email: 'member3@example.com',
      name: 'Charlie Warrior',
      password: hashedPassword,
      phone: '+5511955555555',
    },
  });

  console.log('✅ Users created: 5');

  // ============================================
  // ACADEMIES
  // ============================================
  console.log('🏢 Creating academies...');

  const academy1 = await prisma.academy.create({
    data: {
      name: 'Elite Fight Academy',
      slug: 'elite-fight-academy',
      description: 'Academia de artes marciais de elite com instrutores certificados',
      email: 'contato@elitefight.com',
      phone: '+5511911111111',
      website: 'https://elitefight.com',
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      country: 'BR',
      latitude: -23.5613,
      longitude: -46.6565,
      geohash: '6gycfmk',
    },
  });

  const academy2 = await prisma.academy.create({
    data: {
      name: 'Warriors Dojo',
      slug: 'warriors-dojo',
      description: 'Dojo tradicional de artes marciais japonesas',
      email: 'contact@warriorsdojo.com',
      phone: '+5511922222222',
      street: 'Rua Augusta',
      number: '500',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01305-000',
      country: 'BR',
      latitude: -23.5505,
      longitude: -46.6605,
      geohash: '6gycfm9',
    },
  });

  console.log('✅ Academies created: 2');

  // ============================================
  // ACADEMY USERS (Roles)
  // ============================================
  console.log('🔗 Linking users to academies...');

  await prisma.academyUser.createMany({
    data: [
      // Academy 1
      { userId: owner.id, academyId: academy1.id, role: 'OWNER' },
      { userId: instructor.id, academyId: academy1.id, role: 'INSTRUCTOR' },
      { userId: member1.id, academyId: academy1.id, role: 'MEMBER' },
      { userId: member2.id, academyId: academy1.id, role: 'MEMBER' },
      
      // Academy 2
      { userId: owner.id, academyId: academy2.id, role: 'OWNER' },
      { userId: member3.id, academyId: academy2.id, role: 'MEMBER' },
    ],
  });

  console.log('✅ Academy users linked: 6');

  // ============================================
  // MARTIAL ARTS
  // ============================================
  console.log('🥋 Creating martial arts...');

  const jiujitsu = await prisma.martialArt.create({
    data: {
      name: 'Jiu-Jitsu',
      description: 'Brazilian Jiu-Jitsu - Arte marcial focada em técnicas de solo',
      icon: '🥋',
    },
  });

  const muayThai = await prisma.martialArt.create({
    data: {
      name: 'Muay Thai',
      description: 'Arte marcial tailandesa conhecida como "arte das oito armas"',
      icon: '🥊',
    },
  });

  const karate = await prisma.martialArt.create({
    data: {
      name: 'Karate',
      description: 'Arte marcial japonesa focada em golpes de mão e pé',
      icon: '🥋',
    },
  });

  const boxing = await prisma.martialArt.create({
    data: {
      name: 'Boxing',
      description: 'Esporte de combate usando apenas os punhos',
      icon: '🥊',
    },
  });

  console.log('✅ Martial arts created: 4');

  // ============================================
  // LINK MARTIAL ARTS TO ACADEMIES
  // ============================================
  console.log('🔗 Linking martial arts to academies...');

  await prisma.academyMartialArt.createMany({
    data: [
      { academyId: academy1.id, martialArtId: jiujitsu.id },
      { academyId: academy1.id, martialArtId: muayThai.id },
      { academyId: academy1.id, martialArtId: boxing.id },
      { academyId: academy2.id, martialArtId: karate.id },
      { academyId: academy2.id, martialArtId: jiujitsu.id },
    ],
  });

  console.log('✅ Martial arts linked to academies: 5');

  // ============================================
  // BELT RANKS (Jiu-Jitsu)
  // ============================================
  console.log('🎽 Creating belt ranks...');

  const jiujitsuBelts = [
    { name: 'Branca', color: '#FFFFFF', order: 1 },
    { name: 'Azul', color: '#0066CC', order: 2 },
    { name: 'Roxa', color: '#8B00FF', order: 3 },
    { name: 'Marrom', color: '#8B4513', order: 4 },
    { name: 'Preta', color: '#000000', order: 5 },
  ];

  for (const belt of jiujitsuBelts) {
    await prisma.beltRank.create({
      data: {
        ...belt,
        martialArtId: jiujitsu.id,
      },
    });
  }

  // ============================================
  // BELT RANKS (Karate)
  // ============================================
  const karateBelts = [
    { name: 'Branca', color: '#FFFFFF', order: 1 },
    { name: 'Amarela', color: '#FFFF00', order: 2 },
    { name: 'Laranja', color: '#FF8C00', order: 3 },
    { name: 'Verde', color: '#008000', order: 4 },
    { name: 'Roxa', color: '#8B00FF', order: 5 },
    { name: 'Marrom', color: '#8B4513', order: 6 },
    { name: 'Preta', color: '#000000', order: 7 },
  ];

  for (const belt of karateBelts) {
    await prisma.beltRank.create({
      data: {
        ...belt,
        martialArtId: karate.id,
      },
    });
  }

  console.log('✅ Belt ranks created: 12');

  // ============================================
  // PLANS
  // ============================================
  console.log('💳 Creating plans...');

  const plan1 = await prisma.plan.create({
    data: {
      name: 'Plano Mensal Jiu-Jitsu',
      description: 'Acesso ilimitado às aulas de Jiu-Jitsu',
      price: 15000, // R$ 150,00
      currency: 'BRL',
      intervalType: 'MONTHLY',
      intervalCount: 1,
      isActive: true,
      trialDays: 7,
      academyId: academy1.id,
      martialArtId: jiujitsu.id,
    },
  });

  const plan2 = await prisma.plan.create({
    data: {
      name: 'Plano Mensal Muay Thai',
      description: 'Acesso ilimitado às aulas de Muay Thai',
      price: 12000, // R$ 120,00
      currency: 'BRL',
      intervalType: 'MONTHLY',
      intervalCount: 1,
      isActive: true,
      academyId: academy1.id,
      martialArtId: muayThai.id,
    },
  });

  const plan3 = await prisma.plan.create({
    data: {
      name: 'Plano Trimestral Completo',
      description: 'Acesso a todas as modalidades por 3 meses',
      price: 40000, // R$ 400,00
      currency: 'BRL',
      intervalType: 'QUARTERLY',
      intervalCount: 1,
      isActive: true,
      trialDays: 14,
      academyId: academy1.id,
      martialArtId: jiujitsu.id,
    },
  });

  const plan4 = await prisma.plan.create({
    data: {
      name: 'Plano Mensal Karate',
      description: 'Treinamento tradicional de Karate',
      price: 10000, // R$ 100,00
      currency: 'BRL',
      intervalType: 'MONTHLY',
      intervalCount: 1,
      isActive: true,
      academyId: academy2.id,
      martialArtId: karate.id,
    },
  });

  console.log('✅ Plans created: 4');

  // ============================================
  // SUBSCRIPTIONS (COM EVENT SOURCING)
  // ============================================
  console.log('📝 Creating subscriptions with events...');

  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  // Subscription 1 - Member 1
  const subscription1Id = crypto.randomUUID();
  
  // Evento: SubscriptionCreated
  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: subscription1Id,
      aggregateType: 'Subscription',
      eventType: 'SubscriptionCreated',
      eventData: {
        userId: member1.id,
        planId: plan1.id,
        academyId: academy1.id,
        stripeCustomerId: 'cus_test_member1',
      },
      metadata: {
        userId: member1.id,
        academyId: academy1.id,
      },
      version: 1,
      occurredAt: oneMonthAgo,
    },
  });

  // Evento: SubscriptionActivated
  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: subscription1Id,
      aggregateType: 'Subscription',
      eventType: 'SubscriptionActivated',
      eventData: {
        startDate: oneMonthAgo,
        currentPeriodStart: oneMonthAgo,
        currentPeriodEnd: now,
        stripeSubscriptionId: 'sub_test_member1',
      },
      metadata: {
        userId: member1.id,
        academyId: academy1.id,
      },
      version: 2,
      occurredAt: oneMonthAgo,
    },
  });

  // Read Model
  const subscription1 = await prisma.subscription.create({
    data: {
      id: subscription1Id,
      userId: member1.id,
      planId: plan1.id,
      academyId: academy1.id,
      status: 'ACTIVE',
      startDate: oneMonthAgo,
      currentPeriodStart: oneMonthAgo,
      currentPeriodEnd: now,
      stripeCustomerId: 'cus_test_member1',
      stripeSubscriptionId: 'sub_test_member1',
      version: 2,
    },
  });

  // Subscription 2 - Member 2
  const subscription2Id = crypto.randomUUID();

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: subscription2Id,
      aggregateType: 'Subscription',
      eventType: 'SubscriptionCreated',
      eventData: {
        userId: member2.id,
        planId: plan2.id,
        academyId: academy1.id,
        stripeCustomerId: 'cus_test_member2',
      },
      metadata: {
        userId: member2.id,
        academyId: academy1.id,
      },
      version: 1,
      occurredAt: oneMonthAgo,
    },
  });

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: subscription2Id,
      aggregateType: 'Subscription',
      eventType: 'SubscriptionActivated',
      eventData: {
        startDate: oneMonthAgo,
        currentPeriodStart: oneMonthAgo,
        currentPeriodEnd: now,
        stripeSubscriptionId: 'sub_test_member2',
      },
      metadata: {
        userId: member2.id,
        academyId: academy1.id,
      },
      version: 2,
      occurredAt: oneMonthAgo,
    },
  });

  const subscription2 = await prisma.subscription.create({
    data: {
      id: subscription2Id,
      userId: member2.id,
      planId: plan2.id,
      academyId: academy1.id,
      status: 'ACTIVE',
      startDate: oneMonthAgo,
      currentPeriodStart: oneMonthAgo,
      currentPeriodEnd: now,
      stripeCustomerId: 'cus_test_member2',
      stripeSubscriptionId: 'sub_test_member2',
      version: 2,
    },
  });

  // Subscription 3 - Member 3
  const subscription3Id = crypto.randomUUID();

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: subscription3Id,
      aggregateType: 'Subscription',
      eventType: 'SubscriptionCreated',
      eventData: {
        userId: member3.id,
        planId: plan4.id,
        academyId: academy2.id,
        stripeCustomerId: 'cus_test_member3',
      },
      metadata: {
        userId: member3.id,
        academyId: academy2.id,
      },
      version: 1,
      occurredAt: oneMonthAgo,
    },
  });

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: subscription3Id,
      aggregateType: 'Subscription',
      eventType: 'SubscriptionActivated',
      eventData: {
        startDate: oneMonthAgo,
        currentPeriodStart: oneMonthAgo,
        currentPeriodEnd: now,
        stripeSubscriptionId: 'sub_test_member3',
      },
      metadata: {
        userId: member3.id,
        academyId: academy2.id,
      },
      version: 2,
      occurredAt: oneMonthAgo,
    },
  });

  const subscription3 = await prisma.subscription.create({
    data: {
      id: subscription3Id,
      userId: member3.id,
      planId: plan4.id,
      academyId: academy2.id,
      status: 'ACTIVE',
      startDate: oneMonthAgo,
      currentPeriodStart: oneMonthAgo,
      currentPeriodEnd: now,
      stripeCustomerId: 'cus_test_member3',
      stripeSubscriptionId: 'sub_test_member3',
      version: 2,
    },
  });

  console.log('✅ Subscriptions created: 3');
  console.log('✅ Subscription events created: 6');

  // ============================================
  // PAYMENTS (COM EVENT SOURCING)
  // ============================================
  console.log('💰 Creating payments with events...');

  // Payment 1 - Member 1
  const payment1Id = crypto.randomUUID();

  // Evento: PaymentCreated
  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: payment1Id,
      aggregateType: 'Payment',
      eventType: 'PaymentCreated',
      eventData: {
        subscriptionId: subscription1.id,
        academyId: academy1.id,
        createdBy: member1.id,
        amount: 15000,
        currency: 'BRL',
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_test_001',
      },
      metadata: {
        userId: member1.id,
        academyId: academy1.id,
      },
      version: 1,
      occurredAt: oneMonthAgo,
    },
  });

  // Evento: PaymentSucceeded
  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: payment1Id,
      aggregateType: 'Payment',
      eventType: 'PaymentSucceeded',
      eventData: {
        paidAt: oneMonthAgo,
      },
      metadata: {
        userId: member1.id,
        academyId: academy1.id,
      },
      version: 2,
      occurredAt: oneMonthAgo,
    },
  });

  // Read Model
  await prisma.payment.create({
    data: {
      id: payment1Id,
      subscriptionId: subscription1.id,
      academyId: academy1.id,
      createdBy: member1.id,
      amount: 15000,
      currency: 'BRL',
      status: 'SUCCEEDED',
      paymentMethod: 'card',
      paidAt: oneMonthAgo,
      stripePaymentIntentId: 'pi_test_001',
      version: 2,
    },
  });

  // Payment 2 - Member 2
  const payment2Id = crypto.randomUUID();

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: payment2Id,
      aggregateType: 'Payment',
      eventType: 'PaymentCreated',
      eventData: {
        subscriptionId: subscription2.id,
        academyId: academy1.id,
        createdBy: member2.id,
        amount: 12000,
        currency: 'BRL',
        paymentMethod: 'card',
        stripePaymentIntentId: 'pi_test_002',
      },
      metadata: {
        userId: member2.id,
        academyId: academy1.id,
      },
      version: 1,
      occurredAt: oneMonthAgo,
    },
  });

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: payment2Id,
      aggregateType: 'Payment',
      eventType: 'PaymentSucceeded',
      eventData: {
        paidAt: oneMonthAgo,
      },
      metadata: {
        userId: member2.id,
        academyId: academy1.id,
      },
      version: 2,
      occurredAt: oneMonthAgo,
    },
  });

  await prisma.payment.create({
    data: {
      id: payment2Id,
      subscriptionId: subscription2.id,
      academyId: academy1.id,
      createdBy: member2.id,
      amount: 12000,
      currency: 'BRL',
      status: 'SUCCEEDED',
      paymentMethod: 'card',
      paidAt: oneMonthAgo,
      stripePaymentIntentId: 'pi_test_002',
      version: 2,
    },
  });

  // Payment 3 - Member 3
  const payment3Id = crypto.randomUUID();

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: payment3Id,
      aggregateType: 'Payment',
      eventType: 'PaymentCreated',
      eventData: {
        subscriptionId: subscription3.id,
        academyId: academy2.id,
        createdBy: member3.id,
        amount: 10000,
        currency: 'BRL',
        paymentMethod: 'pix',
        stripePaymentIntentId: 'pi_test_003',
      },
      metadata: {
        userId: member3.id,
        academyId: academy2.id,
      },
      version: 1,
      occurredAt: oneMonthAgo,
    },
  });

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: payment3Id,
      aggregateType: 'Payment',
      eventType: 'PaymentSucceeded',
      eventData: {
        paidAt: oneMonthAgo,
      },
      metadata: {
        userId: member3.id,
        academyId: academy2.id,
      },
      version: 2,
      occurredAt: oneMonthAgo,
    },
  });

  await prisma.payment.create({
    data: {
      id: payment3Id,
      subscriptionId: subscription3.id,
      academyId: academy2.id,
      createdBy: member3.id,
      amount: 10000,
      currency: 'BRL',
      status: 'SUCCEEDED',
      paymentMethod: 'pix',
      paidAt: oneMonthAgo,
      stripePaymentIntentId: 'pi_test_003',
      version: 2,
    },
  });

  console.log('✅ Payments created: 3');
  console.log('✅ Payment events created: 6');

  // ============================================
  // ATTENDANCES (COM EVENT SOURCING)
  // ============================================
  console.log('✅ Creating attendances with events...');

  const daysBack = 30;
  let attendanceEventCount = 0;

  // Member1 - frequente (20 presenças no último mês)
  for (let i = 0; i < 20; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - Math.floor(Math.random() * daysBack));
    
    const attendanceId = crypto.randomUUID();

    // Evento: CheckedIn
    await prisma.event.create({
      data: {
        eventId: crypto.randomUUID(),
        aggregateId: attendanceId,
        aggregateType: 'Attendance',
        eventType: 'CheckedIn',
        eventData: {
          userId: member1.id,
          academyId: academy1.id,
          checkInAt: date,
        },
        metadata: {
          userId: member1.id,
          academyId: academy1.id,
        },
        version: 1,
        occurredAt: date,
      },
    });
    attendanceEventCount++;

    // Read Model
    await prisma.attendance.create({
      data: {
        id: attendanceId,
        userId: member1.id,
        academyId: academy1.id,
        checkInAt: date,
        version: 1,
      },
    });
  }

  // Member2 - moderado (10 presenças no último mês)
  for (let i = 0; i < 10; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - Math.floor(Math.random() * daysBack));
    
    const attendanceId = crypto.randomUUID();

    await prisma.event.create({
      data: {
        eventId: crypto.randomUUID(),
        aggregateId: attendanceId,
        aggregateType: 'Attendance',
        eventType: 'CheckedIn',
        eventData: {
          userId: member2.id,
          academyId: academy1.id,
          checkInAt: date,
        },
        metadata: {
          userId: member2.id,
          academyId: academy1.id,
        },
        version: 1,
        occurredAt: date,
      },
    });
    attendanceEventCount++;

    await prisma.attendance.create({
      data: {
        id: attendanceId,
        userId: member2.id,
        academyId: academy1.id,
        checkInAt: date,
        version: 1,
      },
    });
  }

  // Member3 - inativo (última presença há 15 dias)
  const fifteenDaysAgo = new Date(now);
  fifteenDaysAgo.setDate(now.getDate() - 15);
  
  const attendance3Id = crypto.randomUUID();

  await prisma.event.create({
    data: {
      eventId: crypto.randomUUID(),
      aggregateId: attendance3Id,
      aggregateType: 'Attendance',
      eventType: 'CheckedIn',
      eventData: {
        userId: member3.id,
        academyId: academy2.id,
        checkInAt: fifteenDaysAgo,
      },
      metadata: {
        userId: member3.id,
        academyId: academy2.id,
      },
      version: 1,
      occurredAt: fifteenDaysAgo,
    },
  });
  attendanceEventCount++;

  await prisma.attendance.create({
    data: {
      id: attendance3Id,
      userId: member3.id,
      academyId: academy2.id,
      checkInAt: fifteenDaysAgo,
      version: 1,
    },
  });

  console.log('✅ Attendances created: 31');
  console.log(`✅ Attendance events created: ${attendanceEventCount}`);

  // ============================================
  // DEVICE TOKENS
  // ============================================
  console.log('📱 Creating device tokens...');

  await prisma.deviceToken.createMany({
    data: [
      {
        userId: member1.id,
        token: 'expo-token-member1-ios',
        platform: 'IOS',
        isActive: true,
      },
      {
        userId: member2.id,
        token: 'expo-token-member2-android',
        platform: 'ANDROID',
        isActive: true,
      },
      {
        userId: member3.id,
        token: 'expo-token-member3-android',
        platform: 'ANDROID',
        isActive: true,
      },
    ],
  });

  console.log('✅ Device tokens created: 3');

  // ============================================
  // NOTIFICATION LOGS
  // ============================================
  console.log('🔔 Creating notification logs...');

  await prisma.notificationLog.createMany({
    data: [
      {
        userId: member3.id,
        title: 'Sentimos sua falta!',
        body: 'Você não treina há 15 dias. Volte logo!',
        status: 'SENT',
        sentAt: new Date(),
        oneSignalId: 'onesignal-notif-001',
      },
    ],
  });

  console.log('✅ Notification logs created: 1');

  // ============================================
  // PROJECTIONS (Revenue & Attendance)
  // ============================================
  console.log('📊 Creating projections...');

  // Revenue Projection - Academy 1
  await prisma.revenueProjection.create({
    data: {
      academyId: academy1.id,
      period: new Date(now.getFullYear(), now.getMonth(), 1),
      periodType: 'MONTHLY',
      totalRevenue: 27000, // 15000 + 12000
      totalPayments: 2,
      successfulPayments: 2,
      failedPayments: 0,
    },
  });

  // Revenue Projection - Academy 2
  await prisma.revenueProjection.create({
    data: {
      academyId: academy2.id,
      period: new Date(now.getFullYear(), now.getMonth(), 1),
      periodType: 'MONTHLY',
      totalRevenue: 10000,
      totalPayments: 1,
      successfulPayments: 1,
      failedPayments: 0,
    },
  });

  // Attendance Projection - Academy 1
  await prisma.attendanceProjection.create({
    data: {
      academyId: academy1.id,
      period: new Date(now.getFullYear(), now.getMonth(), 1),
      periodType: 'MONTHLY',
      totalCheckIns: 30, // 20 + 10
      uniqueUsers: 2, // member1 + member2
      averageDuration: null,
    },
  });

  // Attendance Projection - Academy 2
  await prisma.attendanceProjection.create({
    data: {
      academyId: academy2.id,
      period: new Date(now.getFullYear(), now.getMonth(), 1),
      periodType: 'MONTHLY',
      totalCheckIns: 1,
      uniqueUsers: 1, // member3
      averageDuration: null,
    },
  });

  console.log('✅ Projections created: 4');

  // ============================================
  // SNAPSHOTS (opcional - para performance)
  // ============================================
  console.log('📸 Creating snapshots...');

  // Snapshot do Payment 1
  await prisma.snapshot.create({
    data: {
      aggregateId: payment1Id,
      aggregateType: 'Payment',
      version: 2,
      data: {
        id: payment1Id,
        subscriptionId: subscription1.id,
        academyId: academy1.id,
        createdBy: member1.id,
        amount: 15000,
        currency: 'BRL',
        status: 'SUCCEEDED',
        paymentMethod: 'card',
        paidAt: oneMonthAgo.toISOString(),
        stripePaymentIntentId: 'pi_test_001',
      },
    },
  });

  console.log('✅ Snapshots created: 1');

  // ============================================
  // SUMMARY
  // ============================================
  const totalEvents = await prisma.event.count();

  console.log('\n🎉 Seed completed successfully with Event Sourcing!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: 5`);
  console.log(`   - Academies: 2`);
  console.log(`   - Martial Arts: 4`);
  console.log(`   - Belt Ranks: 12`);
  console.log(`   - Plans: 4`);
  console.log(`   - Subscriptions: 3 (6 events)`);
  console.log(`   - Payments: 3 (6 events)`);
  console.log(`   - Attendances: 31 (${attendanceEventCount} events)`);
  console.log(`   - Device Tokens: 3`);
  console.log(`   - Notifications: 1`);
  console.log(`   - Projections: 4`);
  console.log(`   - Snapshots: 1`);
  console.log(`   - 📝 Total Events: ${totalEvents}\n`);

  console.log('🔑 Test credentials:');
  console.log('   Owner: owner@academy.com / 123456');
  console.log('   Instructor: instructor@academy.com / 123456');
  console.log('   Member 1: member1@example.com / 123456');
  console.log('   Member 2: member2@example.com / 123456');
  console.log('   Member 3: member3@example.com / 123456\n');

  console.log('🎯 Event Sourcing:');
  console.log('   - Todos os eventos estão na tabela "events"');
  console.log('   - Read models estão em "payments", "subscriptions", "attendances"');
  console.log('   - Projeções em "revenue_projections" e "attendance_projections"');
  console.log('   - Snapshots em "snapshots" para performance\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });