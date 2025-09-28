import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import UserForm from "../pages/users/UserForm";
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

// Helper to wrap UserForm with SessionContext
const renderWithContext = (ui, { role = "global-admin", userID = "u1" } = {}) =>
  render(
    <SessionContext.Provider value={{ role, userID }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("UserForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({}); // not editing

    // Mock API responses
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/universities`)
      .reply(200, { universities: [] });
    mockAxios.onGet(`${GATEWAY_URL}/auth/users`).reply(200, { users: [] });

    renderWithContext(<UserForm />, { role: "global-admin" });

    const submitButton = await screen.findByRole("button", { name: /create/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/users.errorIdentityRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/users.errorNameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/users.errorFirstSurnameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/users.errorEmailRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/users.errorRoleRequired/i)).toBeInTheDocument();
    });
  });
});
