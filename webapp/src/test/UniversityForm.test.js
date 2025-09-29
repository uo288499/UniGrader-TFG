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

  it("updates form fields on input change", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    renderWithContext(<UniversityForm />);
    const nameInput = await screen.findByLabelText(/universities.name/i);
    const addressInput = screen.getByLabelText(/universities.address/i);
    const emailInput = screen.getByLabelText(/universities.email/i);
    const phoneInput = screen.getByLabelText(/universities.phone/i);

    fireEvent.change(nameInput, { target: { value: "New University" } });
    fireEvent.change(addressInput, { target: { value: "123 Main St" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "+34123456789" } });

    expect(nameInput.value).toBe("New University");
    expect(addressInput.value).toBe("123 Main St");
    expect(emailInput.value).toBe("test@example.com");
    expect(phoneInput.value).toBe("+34123456789");
  });

  it("submits form successfully for creation", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    mockAxios.onPost(`${GATEWAY_URL}/academic/universities`).reply(200, {
      university: { _id: "uni123", name: "Test Uni" },
    });

    renderWithContext(<UniversityForm />);

    const nameInput = await screen.findByLabelText(/universities.name/i);
    fireEvent.change(nameInput, { target: { value: "Test Uni" } });

    const submitButton = screen.getByRole("button", { name: /create/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/universities.created/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    mockAxios.onPost(`${GATEWAY_URL}/academic/universities`).reply(500, {
      errorKey: "serverError",
    });

    renderWithContext(<UniversityForm />);
    const nameInput = await screen.findByLabelText(/universities.name/i);
    fireEvent.change(nameInput, { target: { value: "Test Uni" } });

    const submitButton = screen.getByRole("button", { name: /create/i });

    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
  });

  it("validates invalid email and phone", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    renderWithContext(<UniversityForm />);
    const emailInput = await screen.findByLabelText(/universities.email/i);
    const phoneInput = screen.getByLabelText(/universities.phone/i);

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(phoneInput, { target: { value: "abc123" } });

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/errorInvalidEmail/i)).toBeInTheDocument();
      expect(screen.getByText(/errorInvalidPhone/i)).toBeInTheDocument();
    });
  });
});
