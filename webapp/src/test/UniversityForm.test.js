import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router"; 
import UniversityForm from "../pages/universities/UniversityForm";
import { SessionContext } from "../SessionContext";

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { resolvedLanguage: "en", changeLanguage: jest.fn() },
  }),
}));

const renderWithContext = (ui, { role = "global-admin", universityID = "u1" } = {}) =>
  render(
    <SessionContext.Provider value={{ role, universityID }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("UniversityForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    renderWithContext(<UniversityForm />, { role: "global-admin" });

    const submitButton = await screen.findByRole("button", { name: /create/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/errorNameRequired/i)).toBeInTheDocument();
    });
  });
});
