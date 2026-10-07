import { prisma } from "../lib/prisma";
import { createTemplate } from "../lib/services/template.service";

// Seeds the coach's exercise library and one sample template. Safe to re-run.
const exercises: [string, "STRENGTH" | "CARDIO" | "MOBILITY" | "CONDITIONING"][] = [
  ["Barbell Bench Press", "STRENGTH"],
  ["Incline Dumbbell Press", "STRENGTH"],
  ["Overhead Press", "STRENGTH"],
  ["Lateral Raise", "STRENGTH"],
  ["Triceps Pushdown", "STRENGTH"],
  ["Lat Pulldown", "STRENGTH"],
  ["Barbell Row", "STRENGTH"],
  ["Pull-ups", "STRENGTH"],
  ["Biceps Curl", "STRENGTH"],
  ["Back Squat", "STRENGTH"],
  ["Romanian Deadlift", "STRENGTH"],
  ["Leg Press", "STRENGTH"],
  ["Leg Curl", "STRENGTH"],
  ["Calf Raise", "STRENGTH"],
  ["Treadmill", "CARDIO"],
  ["Stationary Bike", "CARDIO"],
];

async function main() {
  const email = (
    process.env.SEED_COACH_EMAIL ||
    process.env.ADMIN_EMAILS?.split(",")[0] ||
    "coach@example.com"
  )
    .trim()
    .toLowerCase();

  const coach = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name: "Coach", role: "ADMIN", timezone: "Africa/Cairo" },
  });

  for (const [name, category] of exercises) {
    await prisma.exerciseMaster.upsert({
      where: { coachId_name: { coachId: coach.id, name } },
      update: {},
      create: { coachId: coach.id, name, category },
    });
  }

  const lib = await prisma.exerciseMaster.findMany({ where: { coachId: coach.id } });
  const id = (n: string) => lib.find((e) => e.name === n)!.id;
  const ex = (n: string, targetSets: number, targetReps: string) => ({ exerciseMasterId: id(n), targetSets, targetReps });

  const templateName = "4-Week Upper/Lower (sample)";
  const exists = await prisma.workoutBlockTemplate.findUnique({
    where: { coachId_name: { coachId: coach.id, name: templateName } },
  });
  if (!exists) {
    await createTemplate(coach.id, {
      name: templateName,
      description: "Sample 4-day upper/lower split",
      durationWeeks: 4,
      days: [
        { dayName: "Upper A", exercises: [ex("Barbell Bench Press", 4, "6-8"), ex("Barbell Row", 4, "8-10"), ex("Overhead Press", 3, "8-10"), ex("Biceps Curl", 3, "10-12")] },
        { dayName: "Lower A", exercises: [ex("Back Squat", 4, "6-8"), ex("Romanian Deadlift", 3, "8-10"), ex("Leg Curl", 3, "10-12"), ex("Calf Raise", 4, "12-15")] },
        { dayName: "Rest", exercises: [] },
        { dayName: "Upper B", exercises: [ex("Incline Dumbbell Press", 4, "8-10"), ex("Lat Pulldown", 4, "8-10"), ex("Lateral Raise", 3, "12-15"), ex("Triceps Pushdown", 3, "10-12")] },
        { dayName: "Lower B", exercises: [ex("Leg Press", 4, "10-12"), ex("Romanian Deadlift", 3, "8-10"), ex("Treadmill", 1, "")] },
      ],
    });
  }

  console.log(`Seeded library and sample template for ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
