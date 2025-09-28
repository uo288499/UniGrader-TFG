import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import { SessionProvider } from "../SessionContext";
import ForgotPassword from "../pages/ForgotPassword";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

describe("ForgotPassword Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  const setup = () =>
    render(
      <BrowserRouter>
        <SessionProvider>
          <ForgotPassword />
        </SessionProvider>
      </BrowserRouter>
    );

  it("shows error when email is empty", async () => {
    setup();

    const sendButton = screen.getByRole("button", { name: /forgotPassword.sendButton/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/users.errorEmailRequired/i)).toBeInTheDocument();
    });
  });

  it("shows error when email is invalid", async () => {
    setup();

    const emailInput = screen.getByLabelText(/forgotPassword.emailLabel/i);
    fireEvent.input(emailInput, { target: { value: "invalid-email" } });

    const sendButton = screen.getByRole("button", { name: /forgotPassword.sendButton/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/users.errorInvalidEmail/i)).toBeInTheDocument();
    });
  });

  it("sends reset request successfully", async () => {
    setup();

    const emailInput = screen.getByLabelText(/forgotPassword.emailLabel/i);
    fireEvent.input(emailInput, { target: { value: "test@example.com" } });

    mockAxios.onPost(`${GATEWAY_URL}/auth/forgot-password`).reply(200, {});

    const sendButton = screen.getByRole("button", { name: /forgotPassword.sendButton/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/forgotPassword.successMessage/i)).toBeInTheDocument();
    });
  });

  it("shows error when server responds with error", async () => {
    setup();

    const emailInput = screen.getByLabelText(/forgotPassword.emailLabel/i);
    fireEvent.input(emailInput, { target: { value: "test@example.com" } });

    mockAxios.onPost(`${GATEWAY_URL}/auth/forgot-password`).reply(400, { errorKey: "genericError" });

    const sendButton = screen.getByRole("button", { name: /forgotPassword.sendButton/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/error.genericError/i)).toBeInTheDocument();
    });
  });

  it("navigates back to login page", async () => {
    setup();

    const backButton = screen.getByRole("button", { name: /forgotPassword.backToLogin/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
