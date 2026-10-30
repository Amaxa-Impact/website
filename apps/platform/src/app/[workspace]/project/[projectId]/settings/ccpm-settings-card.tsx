"use client";

import { useEffect, useState } from "react";
import { useDashboardContext } from "@/components/dashboard/context";
import { useMutation } from "convex/react";

import type { Id } from "@amaxa/backend/_generated/dataModel";
import { api } from "@amaxa/backend/_generated/api";
import { alertDialog } from "@amaxa/ui/alert-dialog-simple";
import { Button } from "@amaxa/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@amaxa/ui/card";
import { Input } from "@amaxa/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amaxa/ui/select";
import { Switch } from "@amaxa/ui/switch";

type BufferMethod = "half" | "rss";

const bufferMethodLabels: Record<BufferMethod, string> = {
  half: "Half of the chain (simple)",
  rss: "Square root of summed risk (shorter)",
};

export function CcpmSettingsCard({ projectId }: { projectId: Id<"projects"> }) {
  const { project } = useDashboardContext();
  const updateSettings = useMutation(api.projects.updateCcpmSettings);

  const [enabled, setEnabled] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bufferMethod, setBufferMethod] = useState<BufferMethod>("half");
  const [safeRatio, setSafeRatio] = useState("1.5");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEnabled(project.ccpmV2 ?? false);
    setStartDate(project.startDate ?? "");
    setDeadline(project.deadline ?? "");
    setBufferMethod(project.bufferMethod ?? "half");
    setSafeRatio(String(project.safeRatio ?? 1.5));
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        projectId,
        ccpmV2: enabled,
        bufferMethod,
        safeRatio: Number(safeRatio),
        ...(startDate ? { startDate } : {}),
        ...(deadline ? { deadline } : {}),
      });
      alertDialog({
        title: "Success",
        description: "Critical Chain settings saved.",
        variant: "default",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alertDialog({
        title: "Error",
        description: `Failed to save: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Critical Chain v2</CardTitle>
        <CardDescription>
          Turns the task board into a live schedule with estimates, buffers and
          a projected finish date. Existing tasks and links are kept.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm font-medium" htmlFor="ccpm-enabled">
            Enable Critical Chain v2 for this project
          </label>
          <Switch
            checked={enabled}
            id="ccpm-enabled"
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="ccpm-start"
            >
              Project start date
            </label>
            <Input
              id="ccpm-start"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="ccpm-deadline"
            >
              Deadline (cohort end)
            </label>
            <Input
              id="ccpm-deadline"
              onChange={(e) => setDeadline(e.target.value)}
              type="date"
              value={deadline}
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="ccpm-method"
            >
              Buffer size
            </label>
            <Select
              onValueChange={(value) => {
                if (value) {
                  setBufferMethod(value as BufferMethod);
                }
              }}
              value={bufferMethod}
            >
              <SelectTrigger className="w-full" id="ccpm-method">
                <SelectValue>{bufferMethodLabels[bufferMethod]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(bufferMethodLabels) as BufferMethod[]).map(
                  (method) => (
                    <SelectItem key={method} value={method}>
                      {bufferMethodLabels[method]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="ccpm-ratio"
            >
              Safe estimate ratio
            </label>
            <Input
              id="ccpm-ratio"
              min={1}
              onChange={(e) => setSafeRatio(e.target.value)}
              step={0.1}
              type="number"
              value={safeRatio}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Used when a task has no safe estimate: safe = best × ratio.
            </p>
          </div>
        </div>

        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving..." : "Save Critical Chain settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
