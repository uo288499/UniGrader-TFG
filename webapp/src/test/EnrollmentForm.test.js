import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import { SessionContext } from "../SessionContext";
import EnrollmentForm from "../pages/enrollments/EnrollmentForm";

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const mockNavigate = jest.fn();

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
  useParams: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

const renderWithContext = (ui, { universityID = "uni1" } = {}) =>
  render(
    <SessionContext.Provider value={{ universityID }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("EnrollmentForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<EnrollmentForm />);

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/enrollments.error.studyProgramRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/enrollments.error.academicYearRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/enrollments.error.accountRequired/i)).toBeInTheDocument();
    });
  });

  it("submits form successfully with MUI selects and autocomplete", async () => {
    ReactRouter.useParams.mockReturnValue({});
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/studyprograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "p1", name: "Program 1" }] });
    mockAxios
      .onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`)
      .reply(200, { accounts: [{ _id: "a1", role: "student", userId: { identityNumber: "123", name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }] });
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`)
      .reply(200, { years: [{ _id: "y1", yearLabel: "2024/25" }] });

    mockAxios.onPost(`${GATEWAY_URL}/academic/enrollments`).reply(200, { enrollment: { _id: "e1" } });

    renderWithContext(<EnrollmentForm />);

    // --- Study Program ---
    const programSelect = (await screen.findAllByRole("combobox"))[0]; // primer select
    fireEvent.mouseDown(programSelect);
    fireEvent.click(screen.getByText("Program 1"));

    // --- Academic Year ---
    const yearSelect = (await screen.findAllByRole("combobox"))[1]; // segundo select
    fireEvent.mouseDown(yearSelect);
    fireEvent.click(screen.getByText("2024/25"));

    // --- Student Account (Autocomplete) ---
    const studentInput = screen.getByLabelText(/studentAccount/i);
    fireEvent.change(studentInput, { target: { value: "John" } });
    await waitFor(() => screen.getByText(/John Doe/i));
    fireEvent.click(screen.getByText(/John Doe/i));

    // --- Submit ---
    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    // --- Verificación ---
    await waitFor(() => {
      expect(screen.getByText(/enrollments.success.created/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});

    // Mocks
    mockAxios
        .onGet(`${GATEWAY_URL}/academic/studyprograms/by-university/uni1`)
        .reply(200, { programs: [{ _id: "p1", name: "Program 1" }] });
    mockAxios
        .onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`)
        .reply(200, { years: [{ _id: "y1", yearLabel: "2024/25" }] });
    mockAxios
        .onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`)
        .reply(200, {
        accounts: [
            {
            _id: "a1",
            role: "student",
            userId: { identityNumber: "123", name: "John", firstSurname: "Doe", secondSurname: "" },
            email: "john@example.com",
            },
        ],
        });
    mockAxios.onPost(`${GATEWAY_URL}/academic/enrollments`).reply(500, { errorKey: "serverError" });

    renderWithContext(<EnrollmentForm />);

    // --- Study Program ---
    const programSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(programSelect);

    await waitFor(() => {
        const listbox = screen.getByRole("listbox");
        fireEvent.click(within(listbox).getByText("Program 1"));
    });

    // --- Academic Year ---
    const yearSelect = (await screen.findAllByRole("combobox"))[1];
    fireEvent.mouseDown(yearSelect);

    await waitFor(() => {
        const listbox = screen.getByRole("listbox");
        fireEvent.click(within(listbox).getByText("2024/25"));
    });

    // --- Student Account (Autocomplete) ---
    const studentInput = screen.getByLabelText(/studentAccount/i);
    fireEvent.change(studentInput, { target: { value: "John" } });

    await waitFor(() => screen.getByText(/John Doe/i));
    fireEvent.click(screen.getByText(/John Doe/i));

    // --- Submit ---
    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
        expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
    });
});
