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

const renderWithContext = (ui, { role = "global-admin", userID = "u1", universityID = "uni1" } = {}) =>
  render(
    <SessionContext.Provider value={{ role, userID, universityID }}>
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

    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });
    mockAxios.onGet(`${GATEWAY_URL}/auth/users`).reply(200, { users: [] });

    renderWithContext(<UserForm />);

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

  it("updates input fields and removes errors", async () => {
    ReactRouter.useParams.mockReturnValue({});
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });
    mockAxios.onGet(`${GATEWAY_URL}/auth/users`).reply(200, { users: [] });

    renderWithContext(<UserForm />);

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    const nameInput = screen.getByLabelText(/users.name/i);
    fireEvent.change(nameInput, { target: { value: "Alice" } });
    expect(nameInput.value).toBe("Alice");

    await waitFor(() => {
      expect(screen.queryByText(/users.errorNameRequired/i)).not.toBeInTheDocument();
    });
  });

  it("selects an existing user from autocomplete", async () => {
    ReactRouter.useParams.mockReturnValue({});
    const existingUser = { _id: "u2", identityNumber: "123", name: "Bob", firstSurname: "Smith", secondSurname: "", photoUrl: "" };

    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });
    mockAxios.onGet(`${GATEWAY_URL}/auth/users`).reply(200, { users: [existingUser] });

    renderWithContext(<UserForm />);

    const autocompleteInput = await screen.findByLabelText(/users.searchExistingUser/i);
    fireEvent.change(autocompleteInput, { target: { value: "Bob" } });

    await act(async () => {
      fireEvent.keyDown(autocompleteInput, { key: "ArrowDown" });
      fireEvent.keyDown(autocompleteInput, { key: "Enter" });
    });

    expect(screen.getByDisplayValue("Bob")).toBeInTheDocument();
  });
});
