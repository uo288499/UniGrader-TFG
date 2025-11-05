import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import { SessionContext } from "../SessionContext";
import GroupForm from "../pages/groups/GroupForm";

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

describe("GroupForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<GroupForm />);
    const submitButton = screen.getByRole("button", { name: /create/i });

    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/group.error.nameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/group.error.courseRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/group.error.atLeastOneProfessor/i)).toBeInTheDocument();
      expect(screen.getByText(/group.error.atLeastOneStudent/i)).toBeInTheDocument();
    });
  });

  it("updates form fields on input change", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<GroupForm />);

    const nameInput = screen.getByLabelText(/group.name/i);
    fireEvent.change(nameInput, { target: { value: "Group A" } });
    expect(nameInput.value).toBe("Group A");
  });

  it("loads courses, enrollments and accounts", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" }, academicYearId: { yearLabel: "2025/26" } }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/enrollments/by-university/uni1`).reply(200, {
      enrollments: [{
        accountId: "s1",
        studyProgramId: { _id: "sp1" },
        account: { userId: { name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }
      }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`).reply(200, {
      accounts: [{ _id: "p1", role: "professor", userId: { name: "Jane", firstSurname: "Smith", secondSurname: "" }, email: "jane@example.com" }]
    });

    renderWithContext(<GroupForm />);

    const courseSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(courseSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Math - 2025/26"));

    await waitFor(() => expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument());
  });

  it("submits form successfully for creation", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" }, academicYearId: { yearLabel: "2025/26" } }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/enrollments/by-university/uni1`).reply(200, {
      enrollments: [{
        accountId: "s1",
        studyProgramId: { _id: "sp1" },
        account: { userId: { name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }
      }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`).reply(200, {
      accounts: [{ _id: "p1", role: "professor", userId: { name: "Jane", firstSurname: "Smith", secondSurname: "" }, email: "jane@example.com" }]
    });
    mockAxios.onPost(`${GATEWAY_URL}/academic/groups`).reply(200, { group: { _id: "g1" } });

    renderWithContext(<GroupForm />);

    fireEvent.change(screen.getByLabelText(/group.name/i), { target: { value: "Group A" } });

    const courseSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(courseSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Math - 2025/26"));

    const addProfButton = await screen.findByTestId("add-professor-p1");
    fireEvent.click(addProfButton);

    const addStudentButton = await screen.findByTestId("add-student-s1");
    fireEvent.click(addStudentButton);

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/group.success.created/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" }, academicYearId: { yearLabel: "2025/26" } }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/enrollments/by-university/uni1`).reply(200, {
      enrollments: [{
        accountId: "s1",
        studyProgramId: { _id: "sp1" },
        account: { userId: { name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }
      }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`).reply(200, {
      accounts: [{ _id: "p1", role: "professor", userId: { name: "Jane", firstSurname: "Smith", secondSurname: "" }, email: "jane@example.com" }]
    });
    mockAxios.onPost(`${GATEWAY_URL}/academic/groups`).reply(500, { errorKey: "serverError" });

    renderWithContext(<GroupForm />);

    fireEvent.change(screen.getByLabelText(/group.name/i), { target: { value: "Group A" } });

    const courseSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(courseSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Math - 2025/26"));

    const addProfButton = await screen.findByTestId("add-professor-p1");
    fireEvent.click(addProfButton);

    const addStudentButton = await screen.findByTestId("add-student-s1");
    fireEvent.click(addStudentButton);

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
  });

  it("handles empty CSV import gracefully", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" }, academicYearId: { yearLabel: "2025/26" } }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/enrollments/by-university/uni1`).reply(200, {
      enrollments: [{
        accountId: "s1",
        studyProgramId: { _id: "sp1" },
        account: { userId: { name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }
      }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`).reply(200, {
      accounts: [{ _id: "p1", role: "professor", userId: { name: "Jane", firstSurname: "Smith", secondSurname: "" }, email: "jane@example.com" }]
    });
    
    renderWithContext(<GroupForm />);

    const file = new File([""], "empty.csv", { type: "text/csv" });

    const input = screen.getByLabelText(/importProfessors/i, { selector: 'input' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/error.emptyCSV/i)).toBeInTheDocument();
    });
  });

  it("validates group name length", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" }, academicYearId: { yearLabel: "2025/26" } }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/enrollments/by-university/uni1`).reply(200, {
      enrollments: [{
        accountId: "s1",
        studyProgramId: { _id: "sp1" },
        account: { userId: { name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }
      }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`).reply(200, {
      accounts: [{ _id: "p1", role: "professor", userId: { name: "Jane", firstSurname: "Smith", secondSurname: "" }, email: "jane@example.com" }]
    });

    renderWithContext(<GroupForm />);
    fireEvent.change(screen.getByLabelText(/group.name/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/group.error.nameRequired/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/group.name/i), { target: { value: "A".repeat(51) } });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/group.error.nameLength/i)).toBeInTheDocument();
    });
  });

  it("navigates back on cancel", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" }, academicYearId: { yearLabel: "2025/26" } }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/enrollments/by-university/uni1`).reply(200, {
      enrollments: [{
        accountId: "s1",
        studyProgramId: { _id: "sp1" },
        account: { userId: { name: "John", firstSurname: "Doe", secondSurname: "" }, email: "john@example.com" }
      }]
    });
    mockAxios.onGet(`${GATEWAY_URL}/authVerify/accounts/by-university/uni1`).reply(200, {
      accounts: [{ _id: "p1", role: "professor", userId: { name: "Jane", firstSurname: "Smith", secondSurname: "" }, email: "jane@example.com" }]
    });

    renderWithContext(<GroupForm />);
    const cancelButton = screen.getByRole("button", { name: /common.cancel/i });
    fireEvent.click(cancelButton);
    expect(mockNavigate).toHaveBeenCalledWith("/groups");
  });
});
