import { describe, expect, it } from "vitest";
import {
  currentGameDate,
  currentLocalDateTime,
  currentPeriodKey,
  isEventEndingSoon,
  isWithinEventWindow,
  msUntilReset,
  resetUrgency,
} from "./period";

// All fixtures in UTC; Bangkok = UTC+7. Daily reset 05:00, weekly Monday 05:00.
describe("currentPeriodKey daily", () => {
  it("stays on the previous game day until 05:00 Bangkok", () => {
    // Bangkok Aug 12 04:59
    expect(currentPeriodKey("daily", Date.UTC(2026, 7, 11, 21, 59))).toBe(
      "d:2026-08-11",
    );
  });

  it("rolls over exactly at 05:00 Bangkok", () => {
    // Bangkok Aug 12 05:00
    expect(currentPeriodKey("daily", Date.UTC(2026, 7, 11, 22, 0))).toBe(
      "d:2026-08-12",
    );
  });

  it("mid-day is the same game day", () => {
    // Bangkok Aug 12 13:00
    expect(currentPeriodKey("daily", Date.UTC(2026, 7, 12, 6, 0))).toBe(
      "d:2026-08-12",
    );
  });

  it("year boundary: Bangkok Jan 1 03:00 is still Dec 31", () => {
    expect(currentPeriodKey("daily", Date.UTC(2025, 11, 31, 20, 0))).toBe(
      "d:2025-12-31",
    );
  });
});

describe("currentPeriodKey weekly", () => {
  it("Sunday night before Monday 05:00 is still last week", () => {
    // Bangkok Mon Aug 17 04:59 → week of Mon Aug 10
    expect(currentPeriodKey("weekly", Date.UTC(2026, 7, 16, 21, 59))).toBe(
      "w:2026-08-10",
    );
  });

  it("rolls to the new week at Monday 05:00 Bangkok", () => {
    // Bangkok Mon Aug 17 05:00
    expect(currentPeriodKey("weekly", Date.UTC(2026, 7, 16, 22, 0))).toBe(
      "w:2026-08-17",
    );
  });

  it("mid-week stays on the same Monday", () => {
    // Bangkok Wed Aug 12 12:00 → week of Mon Aug 10
    expect(currentPeriodKey("weekly", Date.UTC(2026, 7, 12, 5, 0))).toBe(
      "w:2026-08-10",
    );
  });

  it("year boundary: Bangkok Jan 1 03:00 belongs to the week of Dec 29", () => {
    expect(currentPeriodKey("weekly", Date.UTC(2025, 11, 31, 20, 0))).toBe(
      "w:2025-12-29",
    );
  });

  it("a Monday after reset floors to itself", () => {
    // Bangkok Mon Aug 10 12:00
    expect(currentPeriodKey("weekly", Date.UTC(2026, 7, 10, 5, 0))).toBe(
      "w:2026-08-10",
    );
  });
});

describe("reset countdown", () => {
  it("currentGameDate matches the daily period day", () => {
    // Bangkok Aug 12 04:59 → still game-day Aug 11
    expect(currentGameDate(Date.UTC(2026, 7, 11, 21, 59))).toBe("2026-08-11");
    expect(currentGameDate(Date.UTC(2026, 7, 11, 22, 0))).toBe("2026-08-12");
  });

  it("msUntilReset counts down to 05:00 Bangkok", () => {
    // Bangkok Aug 12 04:00 → 1h to daily reset
    expect(msUntilReset("daily", Date.UTC(2026, 7, 11, 21, 0))).toBe(3_600_000);
    // Bangkok Sun Aug 16 05:00 → 24h to Monday 05:00 weekly reset
    expect(msUntilReset("weekly", Date.UTC(2026, 7, 15, 22, 0))).toBe(
      24 * 3_600_000,
    );
  });

  it("currentLocalDateTime is Bangkok wall clock, not game day", () => {
    // Bangkok Aug 12 04:59 — before the 05:00 reset, but already Aug 12
    expect(currentLocalDateTime(Date.UTC(2026, 7, 11, 21, 59))).toBe(
      "2026-08-12T04:59",
    );
  });

  it("resetUrgency escalates none → soon → critical", () => {
    // Bangkok Aug 12 12:00 → 17h left: none
    expect(resetUrgency("daily", Date.UTC(2026, 7, 12, 5, 0))).toBe("none");
    // Bangkok Aug 13 00:00 → 5h left: soon
    expect(resetUrgency("daily", Date.UTC(2026, 7, 12, 17, 0))).toBe("soon");
    // Bangkok Aug 13 04:00 → 1h left: critical
    expect(resetUrgency("daily", Date.UTC(2026, 7, 12, 21, 0))).toBe("critical");
    // weekly: Sunday noon Bangkok → 17h left: soon
    expect(resetUrgency("weekly", Date.UTC(2026, 7, 16, 5, 0))).toBe("soon");
    // weekly: Wednesday → days left: none
    expect(resetUrgency("weekly", Date.UTC(2026, 7, 12, 5, 0))).toBe("none");
  });
});

describe("event windows", () => {
  const window = { eventStart: "2026-08-10T18:00", eventEnd: "2026-08-14T23:00" };

  it("hides the task before it opens and after it closes", () => {
    expect(isWithinEventWindow(window, "2026-08-10T17:59")).toBe(false);
    expect(isWithinEventWindow(window, "2026-08-10T18:00")).toBe(true);
    expect(isWithinEventWindow(window, "2026-08-14T23:00")).toBe(true);
    expect(isWithinEventWindow(window, "2026-08-14T23:01")).toBe(false);
  });

  it("treats legacy date-only bounds as whole days", () => {
    const legacy = { eventStart: "2026-08-10", eventEnd: "2026-08-14" };
    expect(isWithinEventWindow(legacy, "2026-08-10T00:00")).toBe(true);
    expect(isWithinEventWindow(legacy, "2026-08-14T23:59")).toBe(true);
    expect(isWithinEventWindow(legacy, "2026-08-15T00:00")).toBe(false);
  });

  it("open-ended windows only check the bound that is set", () => {
    expect(isWithinEventWindow({ eventEnd: "2026-08-14" }, "2020-01-01T00:00")).toBe(true);
    expect(isWithinEventWindow({}, "2026-08-14T12:00")).toBe(true);
  });

  it("flags the last chance when the event closes before the next reset", () => {
    // Bangkok Aug 12 12:00 → next daily reset Aug 13 05:00
    const now = Date.UTC(2026, 7, 12, 5, 0);
    expect(isEventEndingSoon("2026-08-13T04:00", now)).toBe(true);
    expect(isEventEndingSoon("2026-08-13T06:00", now)).toBe(false);
    // already over, or absent
    expect(isEventEndingSoon("2026-08-11T23:00", now)).toBe(false);
    expect(isEventEndingSoon(null, now)).toBe(false);
  });
});
