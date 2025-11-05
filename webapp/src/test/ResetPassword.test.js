import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import ResetPassword from "../pages/ResetPassword";

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

const renderPage = (token = "mockToken") => {
  ReactRouter.useParams.mockReturnValue({ token });
  return render(
    <BrowserRouter>
      <ResetPassword />
    </BrowserRouter>
  );
};

describe("ResetPassword Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("shows error if API returns invalidToken", async () => {
    mockAxios
      .onPost(`${GATEWAY_URL}/auth/reset-password/mockToken`)
      .reply(400, { errorKey: "invalidToken" });

    renderPage();

    const newPassInput = screen.getByLabelText(/resetPassword.newPassword/i);
    const repeatPassInput = screen.getByLabelText(/resetPassword.confirmPassword/i);;
    const submitButton = screen.getByRole("button", { name: /resetPassword.updateButton/i });

    fireEvent.change(newPassInput, { target: { value: "Password123!" } });
    fireEvent.change(repeatPassInput, { target: { value: "Password123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/error.invalidToken/i);
    });
  });

  it("resets password successfully and redirects to login", async () => {
    mockAxios
      .onPost(`${GATEWAY_URL}/auth/reset-password/mockToken`)
      .reply(200, { message: "Password reset successful" });

    renderPage();

    const newPassInput = screen.getByLabelText(/resetPassword.newPassword/i);
    const repeatPassInput = screen.getByLabelText(/resetPassword.confirmPassword/i);
    const submitButton = screen.getByRole("button", { name: /resetPassword.updateButton/i });

    fireEvent.change(newPassInput, { target: { value: "Password123!" } });
    fireEvent.change(repeatPassInput, { target: { value: "Password123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/resetPassword.successMessage/i)).toBeInTheDocument();
    });

    await new Promise((res) => setTimeout(res, 2100));

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("shows validation errors for weak password", async () => {
    renderPage();

    const newPassInput = screen.getByLabelText(/resetPassword.newPassword/i);
    const repeatPassInput = screen.getByLabelText(/resetPassword.confirmPassword/i);
    const submitButton = screen.getByRole("button", { name: /resetPassword.updateButton/i });

    fireEvent.change(newPassInput, { target: { value: "abc" } });
    fireEvent.change(repeatPassInput, { target: { value: "abc" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/resetPassword.validation.minLength/i);
    });
  });

  it("shows error when passwords do not match", async () => {
    renderPage();

    const newPassInput = screen.getByLabelText(/resetPassword.newPassword/i);
    const repeatPassInput = screen.getByLabelText(/resetPassword.confirmPassword/i);
    const submitButton = screen.getByRole("button", { name: /resetPassword.updateButton/i });

    fireEvent.change(newPassInput, { target: { value: "Password123!" } });
    fireEvent.change(repeatPassInput, { target: { value: "Other123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const mismatchMessages = screen.queryAllByText(/resetPassword.passwordMismatch/i);
      expect(mismatchMessages.length).toBeGreaterThan(0);
    });
  });


  it("toggles password visibility", async () => {
    renderPage();

    const toggleNew = screen.getByLabelText(/aria.togglePassword/i);
    const toggleConfirm = screen.getByLabelText(/aria.toggleConfirmPassword/i);

    fireEvent.click(toggleNew);
    fireEvent.click(toggleConfirm);

    expect(screen.getByLabelText(/resetPassword.newPasswordLabel/i)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/resetPassword.confirmPasswordLabel/i)).toHaveAttribute("type", "text");
  });

  it("shows generic error if server fails without specific key", async () => {
    mockAxios.onPost(`${GATEWAY_URL}/auth/reset-password/mockToken`).reply(400, {});

    renderPage();

    const newPassInput = screen.getByLabelText(/resetPassword.newPassword/i);
    const repeatPassInput = screen.getByLabelText(/resetPassword.confirmPassword/i);
    const submitButton = screen.getByRole("button", { name: /resetPassword.updateButton/i });

    fireEvent.change(newPassInput, { target: { value: "Password123!" } });
    fireEvent.change(repeatPassInput, { target: { value: "Password123!" } });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByText(/error.genericError/i)).toBeInTheDocument()
    );
  });

  it("navigates to login when clicking back button", () => {
    renderPage();

    const backButton = screen.getByRole("button", { name: /resetPassword.backToLogin/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
