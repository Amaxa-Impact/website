import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TimezoneSelect } from "./timezone-select";

afterEach(cleanup);

describe("TimezoneSelect", () => {
  it("shows the friendly label for the chosen timezone", () => {
    render(
      <TimezoneSelect
        onValueChange={() => undefined}
        value="America/New_York"
      />,
    );
    expect(screen.getByText("Eastern Time (ET)")).toBeTruthy();
    expect(screen.queryByText("America/New_York")).toBeNull();
  });
});
