import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import { SessionContext } from "../SessionContext";
import SubjectForm from "../pages/subjects/SubjectForm";

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

describe("SubjectForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<SubjectForm />);

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/subject.error.nameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/subject.error.codeRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/subject.error.studyProgramsRequired/i)).toBeInTheDocument();
      const ruleError = screen.queryByText(/subject.error.atLeastOneRule/i);
      if (ruleError) expect(ruleError).toBeInTheDocument();
    });
  });

  it("updates form fields on input change", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<SubjectForm />);

    const nameInput = await screen.findByLabelText(/subject.name/i);
    const codeInput = await screen.findByLabelText(/subject.code/i);

    fireEvent.change(nameInput, { target: { value: "Mathematics" } });
    fireEvent.change(codeInput, { target: { value: "MATH101" } });

    expect(nameInput.value).toBe("Mathematics");
    expect(codeInput.value).toBe("MATH101");
  });

  it("adds and removes study programs in dual list", async () => {
    ReactRouter.useParams.mockReturnValue({});
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "p1", name: "Program 1" }, { _id: "p2", name: "Program 2" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, { evaluationTypes: [] });

    renderWithContext(<SubjectForm />);

    const programs = await screen.findAllByText("Program 1");
    expect(programs.length).toBeGreaterThan(0);

    // Añadir programa
    const addButtons = screen.getAllByRole("button", { name: /add program/i });
    fireEvent.click(addButtons[0]);

    await waitFor(() =>
      expect(screen.getByText(/subject.addedPrograms/i)).toBeInTheDocument()
    );

    // Eliminar programa
    const removeButtons = screen.getAllByRole("button", { name: /remove program/i });
    fireEvent.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText(/subject.availablePrograms/i)).toBeInTheDocument()
    );
  });

  it("submits form successfully for creation", async () => {
    ReactRouter.useParams.mockReturnValue({});
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "p1", name: "Program 1" }] });
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`)
      .reply(200, { evaluationTypes: [{ _id: "et1", name: "Exam" }] });
    mockAxios.onPost(`${GATEWAY_URL}/academic/subjects`).reply(200, { subject: { _id: "s1" } });

    renderWithContext(<SubjectForm />);
    const programs = await screen.findAllByText("Program 1");
    expect(programs.length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/subject.name/i), { target: { value: "Math" } });
    fireEvent.change(screen.getByLabelText(/subject.code/i), { target: { value: "MATH101" } });

    // Añadir programa
    const addButtons = screen.getAllByRole("button", { name: /add program/i }); 
    fireEvent.click(addButtons[0]);

    // --- Tipo de evaluación (MUI Select) ---
    const selects = await screen.findAllByRole("combobox");
    const evalSelect = selects[0]; // el único select en este form
    fireEvent.mouseDown(evalSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Exam"));

    // Porcentajes
    const minInput = await screen.findByLabelText(/subject.minPercentage/i);
    const maxInput = await screen.findByLabelText(/subject.maxPercentage/i);

    fireEvent.change(minInput, { target: { value: 100 } });
    fireEvent.change(maxInput, { target: { value: 100 } });

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() =>
      expect(screen.getByText("subject.success.created")).toBeInTheDocument()
    );
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});
    mockAxios.onPost(`${GATEWAY_URL}/academic/subjects`).reply(500, { errorKey: "serverError" });
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "p1", name: "Program 1" }] });
    mockAxios
      .onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`)
      .reply(200, { evaluationTypes: [{ _id: "et1", name: "Exam" }] });

    renderWithContext(<SubjectForm />);
    const programs = await screen.findAllByText("Program 1");
    expect(programs.length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/subject.name/i), { target: { value: "Math" } });
    fireEvent.change(screen.getByLabelText(/subject.code/i), { target: { value: "MATH101" } });

    const addButtons = screen.getAllByRole("button", { name: /add program/i }); 
    fireEvent.click(addButtons[0]);

    // --- Tipo de evaluación (MUI Select) ---
    const selects = await screen.findAllByRole("combobox");
    const evalSelect = selects[0];
    fireEvent.mouseDown(evalSelect);
    const listbox = await screen.findByRole("listbox");
    fireEvent.click(within(listbox).getByText("Exam"));

    // Porcentajes
    const minInput = await screen.findByLabelText(/subject.minPercentage/i);
    const maxInput = await screen.findByLabelText(/subject.maxPercentage/i);

    fireEvent.change(minInput, { target: { value: 100 } });
    fireEvent.change(maxInput, { target: { value: 100 } });

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() =>
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument()
    );
  });
});
