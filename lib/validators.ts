import { z } from "zod";

const id = z.string().min(1);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const ClientInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});

export const CreateExerciseSchema = z.object({
  name: z.string().trim().min(1, "Exercise name required").max(100),
  category: z.enum(["STRENGTH", "CARDIO", "MOBILITY", "CONDITIONING"]),
  description: z.string().max(500).optional(),
});

export const CreateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  // One weekly pattern, repeated for every week of the block. A day with no exercises is a rest day.
  days: z
    .array(
      z.object({
        dayName: z.string().trim().min(1).max(50),
        exercises: z
          .array(
            z.object({
              exerciseMasterId: id,
              targetSets: z.number().int().min(1).max(20).default(3),
              targetReps: z.string().max(20).optional(),
            })
          )
          .max(30),
      })
    )
    .min(1)
    .max(7),
});

export const AssignBlockSchema = z.object({
  clientId: id,
  templateId: id,
  startDate: dateOnly,
});

export const UpdateBlockSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]),
});

export const LockDaySchema = z.object({ locked: z.boolean() });

export const LogSetSchema = z.object({
  assignedSetId: id,
  weight: z.number().min(0).max(1000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  isSkipped: z.boolean().default(false),
});

export const CardioLogSchema = z.object({
  exerciseOrder: z.number().int().min(1),
  duration: z.number().int().min(0).max(1000).nullable().optional(),
  speed: z.number().min(0).max(100).nullable().optional(),
  distance: z.number().min(0).max(1000).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const SubmitDaySchema = z.object({
  sets: z.array(LogSetSchema).max(300).default([]),
  cardio: z.array(CardioLogSchema).max(20).default([]),
  dayNotes: z.string().max(1000).optional(),
});

export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;
export type SubmitDay = z.infer<typeof SubmitDaySchema>;
