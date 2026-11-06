import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

export const DEFAULT_MISSIONS = [
  // LEVEL 1: THE STARTER
  {
    title: 'Rise at 05:00 AM Target',
    description: 'Awaken immediately on first alarm. Zero snooze bargaining.',
    category: 'Physical',
    difficulty: 'Starter',
    xpReward: 15,
    levelNumber: 1,
    isCore: true,
    requiresSelfie: false,
    targetTime: '05:00 AM'
  },
  {
    title: 'Hydrate & Electrolyte Primer',
    description: 'Drink 500ml of water immediately upon rising to jumpstart metabolic arousal.',
    category: 'Physical',
    difficulty: 'Starter',
    xpReward: 5,
    levelNumber: 1,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: '10-Minute Morning Sunlight Walk',
    description: 'Optical flow and retinal sunlight exposure within 30 minutes of waking.',
    category: 'Physical',
    difficulty: 'Starter',
    xpReward: 15,
    levelNumber: 1,
    isCore: true,
    requiresSelfie: true,
    targetDurationMinutes: 10
  },
  {
    title: 'Make Bed & Clear Sleeping Area',
    description: 'First physical declaration of order. Establish spatial discipline.',
    category: 'Mental',
    difficulty: 'Starter',
    xpReward: 5,
    levelNumber: 1,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: '30-Minute Morning Digital Blackout',
    description: 'Zero social media, news, or notifications during the first 30 minutes of waking.',
    category: 'Digital Discipline',
    difficulty: 'Starter',
    xpReward: 15,
    levelNumber: 1,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: 'Complete 1 High-Priority Needle-Mover',
    description: 'Execute your primary daily objective before afternoon mental fatigue sets in.',
    category: 'Productivity',
    difficulty: 'Starter',
    xpReward: 25,
    levelNumber: 1,
    isCore: true,
    requiresSelfie: true
  },

  // LEVEL 2: THE BUILDER
  {
    title: 'Consistent Circadian Wake-Up',
    description: 'Maintain strict wake-up within a 15-minute window across consecutive days.',
    category: 'Physical',
    difficulty: 'Intermediate',
    xpReward: 15,
    levelNumber: 2,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: '30-Minute Cardiovascular or Gym Session',
    description: 'Deliberate physical training. Elevated heart rate and athletic conditioning.',
    category: 'Physical',
    difficulty: 'Intermediate',
    xpReward: 20,
    levelNumber: 2,
    isCore: true,
    requiresSelfie: true,
    targetDurationMinutes: 30
  },
  {
    title: '45-Minute Unbroken Deep Work Block',
    description: 'Single-task immersion. Phone placed out of reach. Zero browser distractions.',
    category: 'Productivity',
    difficulty: 'Intermediate',
    xpReward: 25,
    levelNumber: 2,
    isCore: true,
    requiresSelfie: false,
    targetDurationMinutes: 45
  },
  {
    title: '15-Minute Deliberate Reading',
    description: 'Read non-fiction, philosophy, or technical domain books. No algorithmic feeds.',
    category: 'Personal Growth',
    difficulty: 'Intermediate',
    xpReward: 15,
    levelNumber: 2,
    isCore: true,
    requiresSelfie: false,
    targetDurationMinutes: 15
  },
  {
    title: 'Two Core Priority Deliverables',
    description: 'Conquer two defined needle-moving milestones before end of work sprint.',
    category: 'Productivity',
    difficulty: 'Intermediate',
    xpReward: 25,
    levelNumber: 2,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: 'Strict Planned Bedtime Lights-Out',
    description: 'In bed with devices disconnected at least 8 hours prior to wake target.',
    category: 'Health',
    difficulty: 'Intermediate',
    xpReward: 15,
    levelNumber: 2,
    isCore: true,
    requiresSelfie: false
  },

  // LEVEL 3: THE DISCIPLINED
  {
    title: 'Morning Architecture Protocol',
    description: 'Execute cold water, sunlight, hydration, and movement without cognitive friction.',
    category: 'Physical',
    difficulty: 'High Intensity',
    xpReward: 20,
    levelNumber: 3,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: '45-Minute Athletic Training',
    description: 'High-intensity conditioning, resistance training, or calisthenics.',
    category: 'Physical',
    difficulty: 'High Intensity',
    xpReward: 25,
    levelNumber: 3,
    isCore: true,
    requiresSelfie: true,
    targetDurationMinutes: 45
  },
  {
    title: 'Dual 50-Minute Deep Work Sprints',
    description: '100 minutes of pure high-leverage cognitive focus logged in Deep Work Hub.',
    category: 'Productivity',
    difficulty: 'High Intensity',
    xpReward: 30,
    levelNumber: 3,
    isCore: true,
    requiresSelfie: false,
    targetDurationMinutes: 100
  },
  {
    title: '20-Minute Deep Reading & Note Synthesis',
    description: 'Active reading with marginalia or summary note extraction.',
    category: 'Personal Growth',
    difficulty: 'High Intensity',
    xpReward: 20,
    levelNumber: 3,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: 'Zero-Relapse Day Across All Kryptonites',
    description: '100% clean record against personal impulse triggers in Inner Control vault.',
    category: 'Mental',
    difficulty: 'High Intensity',
    xpReward: 25,
    levelNumber: 3,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: 'Daily Log Evening Retrospective',
    description: 'Honest audit of mood, wins, energy leaks, and tomorrow priority.',
    category: 'Mental',
    difficulty: 'High Intensity',
    xpReward: 15,
    levelNumber: 3,
    isCore: true,
    requiresSelfie: false
  },

  // LEVEL 4: THE PERFORMER
  {
    title: 'Triple Deep-Work Power Blocks (150 min)',
    description: 'Three distinct 50-minute blocks of high-output cognitive execution.',
    category: 'Productivity',
    difficulty: 'High Intensity',
    xpReward: 35,
    levelNumber: 4,
    isCore: true,
    requiresSelfie: false,
    targetDurationMinutes: 150
  },
  {
    title: '45-Minute Deliberate Skill Practice',
    description: 'Intense practice targeting frontier weaknesses in your primary craft.',
    category: 'Personal Growth',
    difficulty: 'High Intensity',
    xpReward: 25,
    levelNumber: 4,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: 'Digital Fast & Social Media Silhouette',
    description: 'Under 15 minutes of non-essential recreational screen time for the entire 24h.',
    category: 'Digital Discipline',
    difficulty: 'High Intensity',
    xpReward: 25,
    levelNumber: 4,
    isCore: true,
    requiresSelfie: false
  },

  // LEVEL 5: THE MASTER
  {
    title: 'Autonomous High-Performance Routine',
    description: 'Flawless execution driven by personal standard rather than motivation.',
    category: 'Productivity',
    difficulty: 'High Intensity',
    xpReward: 30,
    levelNumber: 5,
    isCore: true,
    requiresSelfie: false
  },
  {
    title: 'Zero Procrastination Needle-Mover',
    description: 'Attack the single hardest, most intimidating task of the day before 11:00 AM.',
    category: 'Productivity',
    difficulty: 'High Intensity',
    xpReward: 35,
    levelNumber: 5,
    isCore: true,
    requiresSelfie: true
  },
  {
    title: 'Sovereign Evening Philosophical Reflection',
    description: 'Audit character alignment, gratitude, and prepare the subsequent 24 hours.',
    category: 'Mental',
    difficulty: 'High Intensity',
    xpReward: 25,
    levelNumber: 5,
    isCore: true,
    requiresSelfie: false
  }
];

export async function seedDatabase() {
  console.log('Seeding shared REWIRE missions library...');

  // 1. Seed Shared Missions
  for (const m of DEFAULT_MISSIONS) {
    const existing = await prisma.mission.findFirst({
      where: {
        title: m.title,
        levelNumber: m.levelNumber,
        createdById: null
      }
    });

    if (!existing) {
      await prisma.mission.create({
        data: {
          ...m,
          dayNumber: 1,
          createdById: null
        }
      });
    } else {
      await prisma.mission.update({
        where: { id: existing.id },
        data: {
          xpReward: m.xpReward,
          description: m.description
        }
      });
    }
  }

  // 2. Create Sample Demo Account if it does not already exist
  const demoEmail = 'demo@rewire.app';
  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail }
  });

  if (!existingDemo) {
    console.log('Creating sample development demo account (demo@rewire.app)...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    const demoUser = await prisma.user.create({
      data: {
        fullName: 'Alexander Vance',
        email: demoEmail,
        passwordHash,
        progress: {
          create: {
            currentLevel: 2,
            currentDay: 14,
            lifetimeXP: 2450,
            spendableXP: 850,
            currentStreak: 14,
            longestStreak: 14,
            totalCompletedMissions: 28,
            recoveryTokens: 2,
            inRecoveryMode: false
          }
        },
        settings: {
          create: {
            pinCode: '1234',
            pinLockEnabled: false,
            shieldEnabled: false,
            shareWithAI: false
          }
        }
      }
    });

    // Seed sample transactions
    await prisma.xPTransaction.createMany({
      data: [
        {
          userId: demoUser.id,
          amount: 500,
          transactionType: 'earned',
          category: 'boss_challenge',
          description: 'Defeated Level 1 Boss Trial: The Dawn Crucible'
        },
        {
          userId: demoUser.id,
          amount: 25,
          transactionType: 'earned',
          category: 'journal',
          description: 'Daily Log Reflection (+25 XP)'
        }
      ]
    });

    // Seed sample journal entry
    await prisma.journalEntry.create({
      data: {
        userId: demoUser.id,
        date: new Date().toISOString().split('T')[0],
        mood: 'Amazing',
        reflection: 'Strong discipline today. Woke up at 5:00 AM on the first alarm, cleared the morning run, and crushed two 45m deep focus blocks.',
        bestMoment: 'Shipping the backend architecture without distractions.',
        biggestDistraction: 'Late afternoon phone urge, bypassed with cold water reset.',
        whatDidYouLearn: 'Action produces motivation, not the other way around.',
        improveTomorrow: 'Lock in 10:30 PM bedtime strictly.',
        tomorrowPriority: 'Conquer Level 2 Boss Gauntlet'
      }
    });

    console.log('Sample demo account seeded: demo@rewire.app / Password123!');
  } else {
    console.log('Sample demo account already present.');
  }

  console.log('Database seeding successfully finished.');
}

if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
