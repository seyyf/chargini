import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// next-intl's navigation hooks (useRouter/usePathname) delegate to
// next/navigation, which now throws an invariant error when no App Router
// context is mounted (e.g. in plain React Testing Library renders). Stub
// them so components using next-intl's navigation APIs are testable without
// a full Next.js router harness.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    usePathname: () => "/",
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
  };
});
