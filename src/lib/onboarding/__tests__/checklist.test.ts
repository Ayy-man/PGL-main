import { describe, it, expect } from "vitest";
import { deriveChecklist, isChecklistComplete } from "../checklist";
import type { OnboardingState } from "@/types/onboarding";

const EMPTY_STATE: OnboardingState = {
  tour_completed: false,
  admin_checklist: {
    invite_team: false,
    upload_logo: false,
    pick_theme: false,
    create_first_persona: false,
  },
};

const ORG = "org-1";

describe("deriveChecklist", () => {
  it("returns 4 items in canonical order", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: null, theme: "gold" },
      personaCount: 0,
      orgId: ORG,
    });
    expect(items.map((i) => i.key)).toEqual([
      "invite_team",
      "upload_logo",
      "pick_theme",
      "create_first_persona",
    ]);
    expect(items.every((i) => !i.complete)).toBe(true);
  });

  it("self-heals upload_logo when tenant.logo_url is set but state flag is false", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: "https://cdn.example.com/logo.png", theme: "gold" },
      personaCount: 0,
      orgId: ORG,
    });
    expect(items.find((i) => i.key === "upload_logo")!.complete).toBe(true);
  });

  it("self-heals pick_theme when theme != gold", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: null, theme: "onyx" },
      personaCount: 0,
      orgId: ORG,
    });
    expect(items.find((i) => i.key === "pick_theme")!.complete).toBe(true);
  });

  it("self-heals create_first_persona when personaCount > 0", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: null, theme: "gold" },
      personaCount: 3,
      orgId: ORG,
    });
    expect(
      items.find((i) => i.key === "create_first_persona")!.complete
    ).toBe(true);
  });

  it("handles null state gracefully", () => {
    const items = deriveChecklist({
      state: null,
      tenant: { logo_url: null, theme: "gold" },
      personaCount: 0,
      orgId: ORG,
    });
    expect(items).toHaveLength(4);
    expect(items.every((i) => !i.complete)).toBe(true);
  });

  it("handles undefined state gracefully", () => {
    const items = deriveChecklist({
      state: undefined,
      tenant: { logo_url: null, theme: "gold" },
      personaCount: 0,
      orgId: ORG,
    });
    expect(items).toHaveLength(4);
    expect(items.every((i) => !i.complete)).toBe(true);
  });

  it("handles null tenant.theme gracefully (does not self-heal pick_theme)", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: null, theme: null },
      personaCount: 0,
      orgId: ORG,
    });
    expect(items.find((i) => i.key === "pick_theme")!.complete).toBe(false);
  });

  it("ctaHref uses provided orgId", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: null, theme: "gold" },
      personaCount: 0,
      orgId: "my-org",
    });
    expect(items.find((i) => i.key === "invite_team")!.ctaHref).toBe(
      "/my-org/team"
    );
    expect(items.find((i) => i.key === "upload_logo")!.ctaHref).toBe(
      "/my-org/settings/organization"
    );
    expect(items.find((i) => i.key === "pick_theme")!.ctaHref).toBe(
      "/my-org/settings/organization"
    );
    expect(items.find((i) => i.key === "create_first_persona")!.ctaHref).toBe(
      "/my-org/personas"
    );
  });

  it("every item has a non-empty label", () => {
    const items = deriveChecklist({
      state: EMPTY_STATE,
      tenant: { logo_url: null, theme: "gold" },
      personaCount: 0,
      orgId: ORG,
    });
    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});

describe("isChecklistComplete", () => {
  it("is true when all flags set in state", () => {
    expect(
      isChecklistComplete({
        state: {
          tour_completed: true,
          admin_checklist: {
            invite_team: true,
            upload_logo: true,
            pick_theme: true,
            create_first_persona: true,
          },
        },
        tenant: { logo_url: null, theme: "gold" },
        personaCount: 0,
        orgId: ORG,
      })
    ).toBe(true);
  });

  it("is true via self-healing combination (mixed state + observed signals)", () => {
    expect(
      isChecklistComplete({
        state: {
          tour_completed: false,
          admin_checklist: {
            invite_team: true,
            upload_logo: false,
            pick_theme: false,
            create_first_persona: false,
          },
        },
        tenant: { logo_url: "https://x/l.png", theme: "onyx" },
        personaCount: 5,
        orgId: ORG,
      })
    ).toBe(true);
  });

  it("is false when any incomplete", () => {
    expect(
      isChecklistComplete({
        state: EMPTY_STATE,
        tenant: { logo_url: null, theme: "gold" },
        personaCount: 0,
        orgId: ORG,
      })
    ).toBe(false);
  });

  it("is false when only 3 of 4 complete", () => {
    expect(
      isChecklistComplete({
        state: {
          tour_completed: false,
          admin_checklist: {
            invite_team: true,
            upload_logo: true,
            pick_theme: true,
            create_first_persona: false,
          },
        },
        tenant: { logo_url: null, theme: "gold" },
        personaCount: 0,
        orgId: ORG,
      })
    ).toBe(false);
  });
});
