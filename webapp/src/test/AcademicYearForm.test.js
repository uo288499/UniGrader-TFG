import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router"; 
import AcademicYearForm from "../pages/academicYears/AcademicYearForm";
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

const renderWithContext = (ui, { universityID = "uni1" } = {}) =>
  render(
    <SessionContext.Provider value={{ universityID }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("AcademicYearForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({}); // creation

    renderWithContext(<AcademicYearForm />);
    const submitButton = screen.getByRole("button", { name: /create/i });

    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/academicYears.error.yearLabelRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/academicYears.error.startDateRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/academicYears.error.endDateRequired/i)).toBeInTheDocument();
    });
  });

  it("updates form fields on input change", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    renderWithContext(<AcademicYearForm />);
    const yearLabelInput = screen.getByLabelText(/academicYears.yearLabel/i);
    const startDateInput = screen.getByLabelText(/academicYears.startDate/i);
    const endDateInput = screen.getByLabelText(/academicYears.endDate/i);

    fireEvent.change(yearLabelInput, { target: { value: "2025/26" } });
    fireEvent.change(startDateInput, { target: { value: "2025-09-01" } });
    fireEvent.change(endDateInput, { target: { value: "2026-06-30" } });

    expect(yearLabelInput.value).toBe("2025/26");
    expect(startDateInput.value).toBe("2025-09-01");
    expect(endDateInput.value).toBe("2026-06-30");
  });

  it("submits form successfully for creation", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    mockAxios.onPost(`${GATEWAY_URL}/academic/academicyears`).reply(200, {
      academicYear: { _id: "ay123", yearLabel: "2025/26" },
    });

    renderWithContext(<AcademicYearForm />);

    fireEvent.change(screen.getByLabelText(/academicYears.yearLabel/i), { target: { value: "2025/26" } });
    fireEvent.change(screen.getByLabelText(/academicYears.startDate/i), { target: { value: "2025-09-01" } });
    fireEvent.change(screen.getByLabelText(/academicYears.endDate/i), { target: { value: "2026-06-30" } });

    const submitButton = screen.getByRole("button", { name: /create/i });

    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/academicYears.success.created/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    mockAxios.onPost(`${GATEWAY_URL}/academic/academicyears`).reply(500, {
      errorKey: "serverError",
    });

    renderWithContext(<AcademicYearForm />);
    fireEvent.change(screen.getByLabelText(/academicYears.yearLabel/i), { target: { value: "2025/26" } });
    fireEvent.change(screen.getByLabelText(/academicYears.startDate/i), { target: { value: "2025-09-01" } });
    fireEvent.change(screen.getByLabelText(/academicYears.endDate/i), { target: { value: "2026-06-30" } });

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
  });

  it("validates startDate before endDate", async () => {
    ReactRouter.useParams.mockReturnValue({}); 

    renderWithContext(<AcademicYearForm />);
    fireEvent.change(screen.getByLabelText(/academicYears.startDate/i), { target: { value: "2026-06-30" } });
    fireEvent.change(screen.getByLabelText(/academicYears.endDate/i), { target: { value: "2025-09-01" } });
    fireEvent.change(screen.getByLabelText(/academicYears.yearLabel/i), { target: { value: "2025/26" } });

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/academicYears.error.startAfterEnd/i)).toBeInTheDocument();
      expect(screen.getByText(/academicYears.error.endBeforeStart/i)).toBeInTheDocument();
    });
  });

});
