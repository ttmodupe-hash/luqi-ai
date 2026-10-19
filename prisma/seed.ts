import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AfriLearn Dynamic Slang & Linguistic Dictionary...');

  const initialSlangSeed = [
    // Sepitori (Pretoria Urban Dialect)
    {
      languageCode: 'SEPITORI',
      slangTerm: 'tlatsa',
      standardMeaning: 'fill in / enter parameter figures or values',
      confidenceScore: 98,
      learnedInSession: 'SEED_INITIAL_SEPITORI'
    },
    {
      languageCode: 'SEPITORI',
      slangTerm: 'daai ding',
      standardMeaning: 'that specific variable / formula component',
      confidenceScore: 95,
      learnedInSession: 'SEED_INITIAL_SEPITORI'
    },
    {
      languageCode: 'SEPITORI',
      slangTerm: 'ska wara',
      standardMeaning: 'do not worry / equation solved cleanly',
      confidenceScore: 96,
      learnedInSession: 'SEED_INITIAL_SEPITORI'
    },
    {
      languageCode: 'SEPITORI',
      slangTerm: 'chommie',
      standardMeaning: 'study peer / learning partner',
      confidenceScore: 94,
      learnedInSession: 'SEED_INITIAL_SEPITORI'
    },
    {
      languageCode: 'SEPITORI',
      slangTerm: 'mfana',
      standardMeaning: 'young scholar / brother / student',
      confidenceScore: 95,
      learnedInSession: 'SEED_INITIAL_SEPITORI'
    },
    {
      languageCode: 'SEPITORI',
      slangTerm: 'fede',
      standardMeaning: 'all good / ready to commence simulation',
      confidenceScore: 92,
      learnedInSession: 'SEED_INITIAL_SEPITORI'
    },

    // Zulu
    {
      languageCode: 'ZULU',
      slangTerm: 'sawubona',
      standardMeaning: 'respectful greeting to student / welcome',
      confidenceScore: 99,
      learnedInSession: 'SEED_INITIAL_ZULU'
    },
    {
      languageCode: 'ZULU',
      slangTerm: 'bala',
      standardMeaning: 'calculate / compute the value',
      confidenceScore: 97,
      learnedInSession: 'SEED_INITIAL_ZULU'
    },
    {
      languageCode: 'ZULU',
      slangTerm: 'ubuchwepheshe',
      standardMeaning: 'technology / scientific method',
      confidenceScore: 96,
      learnedInSession: 'SEED_INITIAL_ZULU'
    },

    // Swahili
    {
      languageCode: 'SWAHILI',
      slangTerm: 'karibu',
      standardMeaning: 'welcome learner / enter laboratory',
      confidenceScore: 99,
      learnedInSession: 'SEED_INITIAL_SWAHILI'
    },
    {
      languageCode: 'SWAHILI',
      slangTerm: 'hesabu',
      standardMeaning: 'calculate mathematics / physics vectors',
      confidenceScore: 98,
      learnedInSession: 'SEED_INITIAL_SWAHILI'
    },
    {
      languageCode: 'SWAHILI',
      slangTerm: 'mwangaza',
      standardMeaning: 'clarity / breakthrough in scientific principle',
      confidenceScore: 94,
      learnedInSession: 'SEED_INITIAL_SWAHILI'
    },

    // Yoruba
    {
      languageCode: 'YORUBA',
      slangTerm: 'kaabo',
      standardMeaning: 'welcome scholar to interactive chamber',
      confidenceScore: 99,
      learnedInSession: 'SEED_INITIAL_YORUBA'
    },
    {
      languageCode: 'YORUBA',
      slangTerm: 'isiro',
      standardMeaning: 'mathematical computation / scientific analysis',
      confidenceScore: 98,
      learnedInSession: 'SEED_INITIAL_YORUBA'
    }
  ];

  for (const entry of initialSlangSeed) {
    await prisma.dynamicDictionary.upsert({
      where: { slangTerm: entry.slangTerm },
      update: {
        standardMeaning: entry.standardMeaning,
        confidenceScore: entry.confidenceScore
      },
      create: entry
    });
  }

  // Seed default demo user account
  await prisma.userAccount.upsert({
    where: { phoneNumber: '+27820000001' },
    update: { accountTier: 'PREMIUM_5G_6G' },
    create: {
      phoneNumber: '+27820000001',
      accountTier: 'PREMIUM_5G_6G',
      subscriptionValidUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000)
    }
  });

  console.log(`✅ Successfully seeded ${initialSlangSeed.length} dialect entries into DynamicDictionary ledger.`);
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
