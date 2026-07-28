import { subDays, subMinutes } from 'date-fns'
import type { PlanReminderType, Prisma } from '@prisma/client'

type PlanSaleDates = {
  saleDate: Date
  additionalSaleDates: Date[]
}

type ReminderSeed = {
  reminderAt: Date
  saleDate: Date
  saleDateIndex: number
  reminderType: PlanReminderType
}

export function buildPlanReminderSeeds(plan: PlanSaleDates): ReminderSeed[] {
  const seeds = [plan.saleDate, ...plan.additionalSaleDates].flatMap(
    (saleDate, saleDateIndex) => [
      {
        reminderAt: subDays(saleDate, 1),
        saleDate,
        saleDateIndex,
        reminderType: 'ONE_DAY_BEFORE' as const,
      },
      {
        reminderAt: subMinutes(saleDate, 15),
        saleDate,
        saleDateIndex,
        reminderType: 'FIFTEEN_MINUTES_BEFORE' as const,
      },
    ]
  )

  // The database uniqueness key is (planId, reminderAt). Keep the first task
  // when a user configures two sale dates that produce the same reminder time.
  return [...new Map(seeds.map((seed) => [seed.reminderAt.getTime(), seed])).values()]
}

export async function syncPlanReminderTasks(
  tx: Prisma.TransactionClient,
  planId: string,
  plan: PlanSaleDates
): Promise<void> {
  const seeds = buildPlanReminderSeeds(plan)
  const reminderTimes = seeds.map((seed) => seed.reminderAt)

  await tx.planReminderTask.deleteMany({
    where: {
      planId,
      status: 'PENDING',
      ...(reminderTimes.length > 0 && {
        reminderAt: { notIn: reminderTimes },
      }),
    },
  })

  await Promise.all(
    seeds.map((seed) =>
      tx.planReminderTask.upsert({
        where: {
          planId_reminderAt: {
            planId,
            reminderAt: seed.reminderAt,
          },
        },
        create: {
          planId,
          ...seed,
        },
        update: {
          saleDate: seed.saleDate,
          saleDateIndex: seed.saleDateIndex,
          reminderType: seed.reminderType,
        },
      })
    )
  )
}
