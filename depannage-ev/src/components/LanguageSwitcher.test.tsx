import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders the current locale label", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={{}}>
        <LanguageSwitcher />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: /FR/i })).toBeInTheDocument();
  });
});
