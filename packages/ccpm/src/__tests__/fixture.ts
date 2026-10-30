import type {
  AnalyzeInput,
  EngineLink,
  EngineProject,
  EngineTask,
} from "../types";
import { addDays } from "../dates";

/** Day 0 of the golden fixture. */
export const START = "2026-09-07";

/** The ISO date `day` days after the project start. */
export const iso = (day: number) => addDays(START, day);

export const project: EngineProject = {
  startDate: START,
  deadline: iso(56),
  bufferMethod: "half",
};

const todo = (
  id: string,
  title: string,
  ownerId: string,
  bestDays: number,
  safeDays: number,
): EngineTask => ({ id, title, ownerId, bestDays, safeDays, status: "todo" });

export const tasks: EngineTask[] = [
  todo("T1", "Confirm story with partner", "Maya", 5, 10),
  todo("T2", "Write story & photos", "Maya", 4, 7),
  todo("T3", "Build GoFundMe page", "Tomas", 3, 5),
  todo("T4", "Launch campaign", "Tomas", 2, 3),
  todo("T5", "Promote campaign", "Aisha", 14, 21),
  todo("T6", "Wrap up: final push & report", "Maya", 4, 7),
  todo("F1", "Revamp Instagram", "Aisha", 5, 9),
  todo("F2", "Make 6 Canva posts", "Aisha", 4, 7),
  todo("E1", "Book a speaker", "Jordan", 6, 12),
  todo("E2", "Plan run of show", "Jordan", 3, 5),
  todo("E3", "Host online event", "Jordan", 1, 1),
];

export const links: EngineLink[] = [
  { from: "T1", to: "T2" },
  { from: "T2", to: "T3" },
  { from: "T3", to: "T4" },
  { from: "F2", to: "T4" },
  { from: "T4", to: "T5" },
  { from: "T5", to: "T6" },
  { from: "E3", to: "T6" },
  { from: "F1", to: "F2" },
  { from: "E1", to: "E2" },
  { from: "E2", to: "E3" },
];

type Progress = Partial<EngineTask>;

/** The fixture tasks with progress applied; dates are given as day numbers. */
export function withProgress(progress: Record<string, Progress>): EngineTask[] {
  return tasks.map((task) => ({ ...task, ...progress[task.id] }));
}

const done = (start: number, finish: number): Progress => ({
  status: "completed",
  actualStart: iso(start),
  actualFinish: iso(finish),
});

const inProgress = (start: number, daysRemaining: number): Progress => ({
  status: "in_progress",
  actualStart: iso(start),
  daysRemaining,
});

// The brief's checkpoint table doesn't list updates for the F or E tasks, but
// the expected numbers only hold if they behave as planned: an unstarted
// E-chain at day 35 would delay T6 and give 17 buffer days, not 15. So the
// feeding tasks are assumed finished on their planned dates once their latest
// start has passed.
const feedingF = { F1: done(0, 5), F2: done(5, 9) };
const feedingE = { E1: done(13, 19), E2: done(19, 22), E3: done(22, 23) };

export interface Checkpoint {
  today: number;
  input: AnalyzeInput;
  chainCompletePct: number;
  bufferUsedDays: number;
  bufferUsedPct: number;
  zone: "green" | "yellow" | "red";
}

function checkpoint(
  today: number,
  progress: Record<string, Progress>,
  expected: Pick<
    Checkpoint,
    "chainCompletePct" | "bufferUsedDays" | "bufferUsedPct" | "zone"
  >,
): Checkpoint {
  return {
    today,
    input: { project, tasks: withProgress(progress), links, today: iso(today) },
    ...expected,
  };
}

export const checkpoints: Checkpoint[] = [
  checkpoint(
    7,
    { T1: inProgress(0, 3) },
    {
      chainCompletePct: 10.9,
      bufferUsedDays: 5,
      bufferUsedPct: 31.25,
      zone: "yellow",
    },
  ),
  checkpoint(
    14,
    {
      T1: done(0, 10),
      T2: done(10, 13),
      T3: inProgress(13, 1),
      ...feedingF,
    },
    {
      chainCompletePct: 32.8,
      bufferUsedDays: 3,
      bufferUsedPct: 18.75,
      zone: "green",
    },
  ),
  checkpoint(
    35,
    {
      T1: done(0, 10),
      T2: done(10, 13),
      T3: done(13, 15),
      T4: done(15, 17),
      T5: inProgress(17, 8),
      ...feedingF,
      ...feedingE,
    },
    {
      chainCompletePct: 74.0,
      bufferUsedDays: 15,
      bufferUsedPct: 93.75,
      zone: "red",
    },
  ),
  checkpoint(
    42,
    {
      T1: done(0, 10),
      T2: done(10, 13),
      T3: done(13, 15),
      T4: done(15, 17),
      T5: done(17, 40),
      T6: inProgress(40, 2),
      ...feedingF,
      ...feedingE,
    },
    {
      chainCompletePct: 93.75,
      bufferUsedDays: 12,
      bufferUsedPct: 75,
      zone: "yellow",
    },
  ),
];
