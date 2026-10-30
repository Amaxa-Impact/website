import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Id } from "@amaxa/backend/_generated/dataModel";

import type { FieldCondition, FormField } from "./types";
import { ConditionEditor } from "./condition-editor";

afterEach(cleanup);

const fieldId = "k97field0000000000000000000000" as Id<"applicationFormFields">;

const fields = [
  {
    _id: fieldId,
    label: "Which track?",
    type: "select",
    options: ["Arts", "Science"],
  },
] as unknown as FormField[];

describe("ConditionEditor", () => {
  it("shows the question and operator labels, not their ids", () => {
    const condition: FieldCondition = {
      sourceFieldId: fieldId,
      operator: "notEquals",
      value: "Arts",
    };
    render(
      <ConditionEditor
        availableFields={fields}
        condition={condition}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("Which track?")).toBeTruthy();
    expect(screen.queryByText(fieldId)).toBeNull();
    expect(screen.getByText("is not equal to")).toBeTruthy();
    expect(screen.queryByText("notEquals")).toBeNull();
  });
});
