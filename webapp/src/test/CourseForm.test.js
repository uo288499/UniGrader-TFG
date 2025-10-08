import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import { SessionContext } from "../SessionContext";
import CourseForm from "../pages/courses/CourseForm";

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

describe("CourseForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<CourseForm />);

    const submitButton = await screen.findByRole("button", { name: /create/i });

    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/course.error.nameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/course.error.codeRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/course.error.subjectRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/course.error.academicYearRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/course.error.studyProgramRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/course.error.noEvaluationGroups/i)).toBeInTheDocument();
    });
  });

  it("updates form fields on input change", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<CourseForm />);

    const nameInput = screen.getByLabelText(/course.name/i);
    const codeInput = screen.getByLabelText(/course.code/i);

    fireEvent.change(nameInput, { target: { value: "Math 101" } });
    fireEvent.change(codeInput, { target: { value: "MATH101" } });

    expect(nameInput.value).toBe("Math 101");
    expect(codeInput.value).toBe("MATH101");
  });

  it("loads subjects, years, programs and evaluation types", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/subjects/by-university/uni1`)
      .reply(200, { subjects: [{ _id: "s1", name: "Math", studyPrograms: ["sp1"], evaluationPolicyId: "ep1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`)
      .reply(200, { years: [{ _id: "y1", yearLabel: "2025/26" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "sp1", name: "Program 1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`)
      .reply(200, { evaluationTypes: [{ _id: "et1", name: "Exam" }] });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-policies/ep1`)
      .reply(200, { policy: { policyRules: [{ evaluationTypeId: "et1", minPercentage: 0, maxPercentage: 100 }] } });

    renderWithContext(<CourseForm />);

    const selects = await screen.findAllByRole("combobox");

    // Subject
    fireEvent.mouseDown(selects[0]);
    let listbox = await screen.findByRole("listbox");
    const subjectOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Math");
    fireEvent.click(subjectOption);

    // Academic Year
    fireEvent.mouseDown(selects[1]);
    listbox = await screen.findByRole("listbox");
    const yearOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "2025/26");
    fireEvent.click(yearOption);

    // Study Program
    fireEvent.mouseDown(selects[2]);
    listbox = await screen.findByRole("listbox");
    const programOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Program 1");
    fireEvent.click(programOption);

    await waitFor(() => {
      const weights = screen.getAllByText(/course.totalWeight/i);
      expect(weights.length).toBeGreaterThan(0);
    });
  });

  it("submits form successfully for creation", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/subjects/by-university/uni1`)
      .reply(200, { subjects: [{ _id: "s1", name: "Math", studyPrograms: ["sp1"], evaluationPolicyId: "ep1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`)
      .reply(200, { years: [{ _id: "y1", yearLabel: "2025/26" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "sp1", name: "Program 1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`)
      .reply(200, { evaluationTypes: [{ _id: "et1", name: "Exam" }] });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-policies/ep1`)
      .reply(200, { policy: { policyRules: [{ evaluationTypeId: "et1", minPercentage: 0, maxPercentage: 100 }] } });
    mockAxios.onPost(`${GATEWAY_URL}/academic/courses`).reply(200, { course: { _id: "c1" } });

    renderWithContext(<CourseForm />);

    fireEvent.change(screen.getByLabelText(/course.name/i), { target: { value: "Mates 101" } });
    fireEvent.change(screen.getByLabelText(/course.code/i), { target: { value: "MATES01" } });

    const selects = await screen.findAllByRole("combobox");

    // Subject
    fireEvent.mouseDown(selects[0]);
    let listbox = await screen.findByRole("listbox");
    const mathOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Math");
    fireEvent.click(mathOption);

    // Academic Year
    fireEvent.mouseDown(selects[1]);
    listbox = await screen.findByRole("listbox");
    const yearOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "2025/26");
    fireEvent.click(yearOption);

    // Study Program
    fireEvent.mouseDown(selects[2]);
    listbox = await screen.findByRole("listbox");
    const programOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Program 1");
    fireEvent.click(programOption);

    const totalWeightInputs = screen.getAllByLabelText(/course.totalWeight/i);
    fireEvent.change(totalWeightInputs[0], { target: { value: 100 } });

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/course.success.created/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onGet(`${GATEWAY_URL}/academic/subjects/by-university/uni1`)
      .reply(200, { subjects: [{ _id: "s1", name: "Math", studyPrograms: ["sp1"], evaluationPolicyId: "ep1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`)
      .reply(200, { years: [{ _id: "y1", yearLabel: "2025/26" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "sp1", name: "Program 1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`)
      .reply(200, { evaluationTypes: [{ _id: "et1", name: "Exam" }] });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-policies/ep1`)
      .reply(200, { policy: { policyRules: [{ evaluationTypeId: "et1", minPercentage: 0, maxPercentage: 100 }] } });
    mockAxios.onPost(`${GATEWAY_URL}/academic/courses`).reply(500, { errorKey: "serverError" });

    renderWithContext(<CourseForm />);

    fireEvent.change(screen.getByLabelText(/course.name/i), { target: { value: "Mates 101" } });
    fireEvent.change(screen.getByLabelText(/course.code/i), { target: { value: "MATES101" } });

    const selects = await screen.findAllByRole("combobox");

    // Subject
    fireEvent.mouseDown(selects[0]);
    let listbox = await screen.findByRole("listbox");
    const mathOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Math");
    fireEvent.click(mathOption);

    // Academic Year
    fireEvent.mouseDown(selects[1]);
    listbox = await screen.findByRole("listbox");
    const yearOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "2025/26");
    fireEvent.click(yearOption);

    // Study Program
    fireEvent.mouseDown(selects[2]);
    listbox = await screen.findByRole("listbox");
    const programOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Program 1");
    fireEvent.click(programOption);

    fireEvent.change(screen.getByLabelText(/course.totalWeight/i), { target: { value: 100 } });

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
  });
});
