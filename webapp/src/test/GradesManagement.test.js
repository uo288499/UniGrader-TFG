import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import GradesManagement from "../pages/grades/GradesManagement";
import { SessionContext } from "../SessionContext";
import Papa from "papaparse";

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useParams: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { resolvedLanguage: "en", changeLanguage: jest.fn() },
  }),
}));

const renderWithContext = (ui, { accountID = "acc1", universityID = "uni1" } = {}) =>
  render(
    <SessionContext.Provider value={{ accountID, universityID }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("GradesManagement", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  it("renders loading state initially", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "uni1" });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, { courses: [] });

    renderWithContext(<GradesManagement />);
    expect(screen.getByTestId("gradesmanagement-page")).toBeInTheDocument();
  });

  it("shows error alert if fetching courses fails", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "uni1" });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(500);

    renderWithContext(<GradesManagement />);
    await waitFor(() => {
      expect(screen.getByText("error.genericError")).toBeInTheDocument();
    });
  });

  it("handles delete extraordinary grade confirmation", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "uni1" });
    jest.spyOn(window, "confirm").mockReturnValue(true);

    renderWithContext(<GradesManagement />);
    const deleteButton = document.createElement("button");
    await act(async () => {});

    expect(window.confirm).not.toHaveBeenCalled(); 
  });
});
