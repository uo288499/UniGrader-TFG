import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import Home from "../pages/Home";
import { SessionContext } from "../SessionContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      if (key === "welcome") return `Welcome ${opts?.name || ""}`;
      return key;
    },
  }),
}));

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const renderWithContext = (ui, contextValue) =>
  render(
    <SessionContext.Provider value={contextValue}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("Home Page", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  it("renders UniGrader logo and default text", () => {
    renderWithContext(<Home themeMode="light" />, {
      universityID: null,
      role: "student",
      accountID: null,
    });

    const page = screen.getByTestId("home-page");
    expect(page).toBeInTheDocument();

    const logo = screen.getByAltText("UniGrader Logo");
    expect(logo).toHaveAttribute("src", "/images/UniGrader.svg");

    expect(screen.getByText("homePage.student")).toBeInTheDocument();
  });

  it("renders grayscale UniGrader logo in grayscale mode", () => {
    renderWithContext(<Home themeMode="grayscale" />, {
      universityID: null,
      role: "admin",
      accountID: null,
    });

    const logo = screen.getByAltText("UniGrader Logo");
    expect(logo).toHaveAttribute("src", "/images/UniGrader_Gray.svg");
  });

  it("fetches and displays university logo when available", async () => {
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/universities/uni123`)
      .reply(200, {
        success: true,
        university: { largeLogoUrl: "http://test.com/logo.png" },
      });

    renderWithContext(<Home themeMode="light" />, {
      universityID: "uni123",
      role: "teacher",
      accountID: null,
    });

    await waitFor(() => {
      expect(screen.getByAltText("University Logo")).toHaveAttribute(
        "src",
        "http://test.com/logo.png"
      );
    });
  });

  it("fetches and displays account name when available", async () => {
    mockAxios
      .onGet(`${GATEWAY_URL}/authVerify/accounts/acc123`)
      .reply(200, {
        success: true,
        account: {
          userId: {
            name: "John",
            firstSurname: "Doe",
            secondSurname: "Smith",
          },
        },
      });

    renderWithContext(<Home themeMode="light" />, {
      universityID: null,
      role: "student",
      accountID: "acc123",
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome John Doe Smith/i)).toBeInTheDocument();
    });
  });

  it("does not crash when API returns an error", async () => {
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/universities/uni123`)
      .reply(500);

    mockAxios
      .onGet(`${GATEWAY_URL}/authVerify/accounts/acc123`)
      .reply(500);

    renderWithContext(<Home themeMode="light" />, {
      universityID: "uni123",
      role: "student",
      accountID: "acc123",
    });

    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
      expect(screen.getByText("homePage.student")).toBeInTheDocument();
    });
  });
});
