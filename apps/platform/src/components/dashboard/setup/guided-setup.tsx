"use client";

import type { SetupStepKey } from "@/lib/setup";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDashboardContext } from "@/components/dashboard/context";
import { completedSteps, SETUP_STEPS } from "@/lib/setup";
import { IconCheck } from "@tabler/icons-react";
import { useQuery } from "convex/react";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import { api } from "@amaxa/backend/_generated/api";
import { Skeleton } from "@amaxa/ui/skeleton";

import { EstimatesStep, OwnersStep } from "./steps-people";
import { GoalStep, LinksStep, TasksStep } from "./steps-plan";
import { CommitStep, ReviewStep } from "./steps-review";
import { useSetupData } from "./use-setup-data";

/** The paper method, one step at a time: goal to commitment. */
export function GuidedSetup() {
  const { projectId, workspace } = useParams<{
    projectId: Id<"projects">;
    workspace: string;
  }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useDashboardContext();
  const canManage = useQuery(api.projects.canManage, { projectId });
  const data = useSetupData(projectId);

  const requested = SETUP_STEPS.findIndex(
    (s) => s.key === searchParams.get("step"),
  );
  const index = requested === -1 ? 0 : requested;
  const step = SETUP_STEPS[index] ?? SETUP_STEPS[0];
  const chartHref = `/${workspace}/project/${projectId}/tasks`;

  const goTo = (key: SetupStepKey) => {
    router.replace(`?step=${key}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };
  const back =
    index > 0 ? () => goTo(SETUP_STEPS[index - 1]?.key ?? "goal") : undefined;
  const next = () => goTo(SETUP_STEPS[index + 1]?.key ?? "commit");

  if (canManage === false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-sm">
        Only coaches can run the guided setup.
      </div>
    );
  }
  if (canManage === undefined || data === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const done = completedSteps({
    goal: project.description,
    ...(project.startDate ? { startDate: project.startDate } : {}),
    ...(project.deadline ? { deadline: project.deadline } : {}),
    tasks: data.tasks.map((t) => ({ ...t, id: t.id as string })),
    links: data.edges,
    chainView: data.chainView,
    ...(project.commitment ? { committedDate: project.commitment.date } : {}),
  });

  const props = { data, onBack: back, onNext: next };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:grid-cols-[14rem_1fr]">
      <nav aria-label="Setup steps" className="min-w-0">
        <h1 className="mb-3 text-xl font-bold">Guided setup</h1>
        <ol className="flex gap-1 overflow-x-auto md:flex-col">
          {SETUP_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                aria-current={i === index ? "step" : undefined}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap ${
                  i === index
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
                onClick={() => goTo(s.key)}
                type="button"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done.has(s.key)
                      ? "border-primary bg-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  {done.has(s.key) ? (
                    <IconCheck aria-label="done" className="size-3" />
                  ) : (
                    i + 1
                  )}
                </span>
                {s.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 space-y-5">
        <header>
          <p className="text-muted-foreground text-xs">
            Step {index + 1} of {SETUP_STEPS.length}
          </p>
          <h2 className="text-2xl font-bold">{step.title}</h2>
        </header>
        {step.key === "goal" && <GoalStep {...props} />}
        {step.key === "tasks" && <TasksStep {...props} />}
        {step.key === "links" && <LinksStep {...props} />}
        {step.key === "owners" && <OwnersStep {...props} />}
        {step.key === "estimates" && <EstimatesStep {...props} />}
        {step.key === "review" && (
          <ReviewStep {...props} chartHref={chartHref} goTo={goTo} />
        )}
        {step.key === "commit" && (
          <CommitStep
            chartHref={chartHref}
            data={data}
            goTo={goTo}
            onBack={back}
          />
        )}
      </div>
    </div>
  );
}
