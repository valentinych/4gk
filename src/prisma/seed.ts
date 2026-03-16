import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const quiz = await prisma.game.upsert({
    where: { slug: "quiz" },
    update: {},
    create: {
      slug: "quiz",
      name: "Квиз",
      description: "Викторина с вопросами из разных категорий",
      minPlayers: 1,
      maxPlayers: 8,
    },
  });

  const reaction = await prisma.game.upsert({
    where: { slug: "reaction" },
    update: {},
    create: {
      slug: "reaction",
      name: "Реакция",
      description: "Тест на скорость реакции",
      minPlayers: 1,
      maxPlayers: 4,
    },
  });

  const memory = await prisma.game.upsert({
    where: { slug: "memory" },
    update: {},
    create: {
      slug: "memory",
      name: "Память",
      description: "Запоминай и воспроизводи последовательности",
      minPlayers: 1,
      maxPlayers: 2,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      { gameId: quiz.id, text: "Какая столица Польши?", options: JSON.stringify(["Краков", "Варшава", "Гданьск", "Вроцлав"]), answer: "Варшава", category: "География", difficulty: 1 },
      { gameId: quiz.id, text: "В каком году Польша вступила в ЕС?", options: JSON.stringify(["2000", "2002", "2004", "2007"]), answer: "2004", category: "История", difficulty: 2 },
      { gameId: quiz.id, text: "Какая самая длинная река в Польше?", options: JSON.stringify(["Одра", "Висла", "Варта", "Буг"]), answer: "Висла", category: "География", difficulty: 1 },
      { gameId: quiz.id, text: "Кто написал «Пан Тадеуш»?", options: JSON.stringify(["Сенкевич", "Мицкевич", "Словацкий", "Прус"]), answer: "Мицкевич", category: "Литература", difficulty: 2 },
      { gameId: quiz.id, text: "Скорость света в вакууме (км/с)?", options: JSON.stringify(["150 000", "300 000", "500 000", "1 000 000"]), answer: "300 000", category: "Наука", difficulty: 2 },
      { gameId: quiz.id, text: "Самая высокая гора в Польше?", options: JSON.stringify(["Снежка", "Рысы", "Бабья Гора", "Каспровы Верх"]), answer: "Рысы", category: "География", difficulty: 1 },
      { gameId: quiz.id, text: "Какой элемент обозначается Fe?", options: JSON.stringify(["Фтор", "Франций", "Железо", "Фосфор"]), answer: "Железо", category: "Наука", difficulty: 1 },
      { gameId: quiz.id, text: "В каком году началась Вторая мировая война?", options: JSON.stringify(["1937", "1938", "1939", "1940"]), answer: "1939", category: "История", difficulty: 1 },
    ],
  });

  const users = [];
  const names = ["PlayerOne", "QuizMaster", "GamerPro", "SpeedKing", "BrainStorm", "MemoryAce", "FastFingers", "ThinkTank", "QuickMind", "GameHero"];
  for (const name of names) {
    const user = await prisma.user.upsert({
      where: { email: `${name.toLowerCase()}@4gk.pl` },
      update: {},
      create: {
        name,
        email: `${name.toLowerCase()}@4gk.pl`,
        score: Math.floor(Math.random() * 40000) + 10000,
      },
    });
    users.push(user);
  }

  const allGames = [quiz, reaction, memory];
  for (const user of users) {
    for (let i = 0; i < 5 + Math.floor(Math.random() * 10); i++) {
      const game = allGames[Math.floor(Math.random() * allGames.length)];
      await prisma.gameResult.create({
        data: {
          userId: user.id,
          gameId: game.id,
          score: Math.floor(Math.random() * 9000) + 1000,
          duration: Math.floor(Math.random() * 300) + 30,
        },
      });
    }
  }

  await prisma.newsArticle.createMany({
    skipDuplicates: true,
    data: [
      {
        title: "Запуск портала 4gk.pl",
        slug: "launch",
        content: "Мы рады объявить о запуске нашего нового портала онлайн-игр! Присоединяйтесь к нам и начните соревноваться уже сегодня. На портале доступны три игры: Квиз, Реакция и Память.",
        excerpt: "Мы рады объявить о запуске нашего нового портала онлайн-игр!",
        published: true,
        publishedAt: new Date("2026-03-16"),
      },
      {
        title: "Обновление игры «Квиз»",
        slug: "quiz-update",
        content: "Добавлены новые категории вопросов: наука, история, география. Более 500 новых вопросов ждут вас! Мы также улучшили систему подсчёта очков.",
        excerpt: "Добавлены новые категории вопросов: наука, история, география.",
        published: true,
        publishedAt: new Date("2026-03-15"),
      },
      {
        title: "Первый турнир по «Реакции»",
        slug: "tournament",
        content: "Регистрация на первый официальный турнир по игре «Реакция» открыта. Призовой фонд: 1000 PLN! Турнир состоится 1 апреля 2026 года.",
        excerpt: "Регистрация на первый официальный турнир открыта. Призовой фонд: 1000 PLN!",
        published: true,
        publishedAt: new Date("2026-03-14"),
      },
    ],
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
