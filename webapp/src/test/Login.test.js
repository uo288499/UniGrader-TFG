import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import { SessionProvider } from "../SessionContext";
import Login from "../pages/Login";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

describe("Login Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  const setup = () =>
    render(
      <BrowserRouter>
        <SessionProvider>
          <Login />
        </SessionProvider>
      </BrowserRouter>
    );

  it("logs in successfully", async () => {
    setup();

    const emailInput = screen.getByLabelText(/login.emailLabel/i);
    const passwordInput = screen.getByLabelText(/login.passwordLabel/i);
    const loginButton = screen.getByRole("button", { name: /login.signInButton/i });

    mockAxios.onPost(`${GATEWAY_URL}/auth/login`).reply(200, {
      token: "fakeToken",
      userId: "u1",
      accountId: "a1",
      role: "admin",
      universityId: "uni1",
    });

    fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error for invalid credentials (401)", async () => {
    setup();

    const emailInput = screen.getByLabelText(/login.emailLabel/i);
    const passwordInput = screen.getByLabelText(/login.passwordLabel/i);
    const loginButton = screen.getByRole("button", { name: /login.signInButton/i });

    mockAxios.onPost(`${GATEWAY_URL}/auth/login`).reply(401, {
      errorKey: "invalidCredentials",
    });

    fireEvent.input(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/error.invalidCredentials/i)).toBeInTheDocument();
    });
  });

  it("shows generic error when server fails", async () => {
    setup();

    const emailInput = screen.getByLabelText(/login.emailLabel/i);
    const passwordInput = screen.getByLabelText(/login.passwordLabel/i);
    const loginButton = screen.getByRole("button", { name: /login.signInButton/i });

    mockAxios.onPost(`${GATEWAY_URL}/auth/login`).reply(500, {
      message: "Server error",
    });

    fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/error.genericError/i)).toBeInTheDocument();
    });
  });
});
