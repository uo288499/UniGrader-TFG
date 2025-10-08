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
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" } }]
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

    // --- Course Select (MUI) ---
    const courseSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(courseSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Math"));

    // Esperar a que se renderice el profesor
    await waitFor(() => expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument());
  });

  it("submits form successfully for creation", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" } }]
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

    // --- Course Select (MUI) ---
    const courseSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(courseSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Math"));

    // --- Add professors/students ---
    fireEvent.click(screen.getByRole("button", { name: /add professor/i }));
    fireEvent.click(screen.getByRole("button", { name: /add student/i }));

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/group.success.created/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", studyProgramId: { _id: "sp1" } }]
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

    // --- Course Select (MUI) ---
    const courseSelect = (await screen.findAllByRole("combobox"))[0];
    fireEvent.mouseDown(courseSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Math"));

    // --- Add professors/students ---
    fireEvent.click(screen.getByRole("button", { name: /add professor/i }));
    fireEvent.click(screen.getByRole("button", { name: /add student/i }));

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
  });
});
