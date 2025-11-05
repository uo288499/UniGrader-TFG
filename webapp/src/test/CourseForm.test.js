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

    fireEvent.mouseDown(selects[0]);
    let listbox = await screen.findByRole("listbox");
    const subjectOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Math");
    fireEvent.click(subjectOption);

    fireEvent.mouseDown(selects[1]);
    listbox = await screen.findByRole("listbox");
    const yearOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "2025/26");
    fireEvent.click(yearOption);

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
    fireEvent.change(screen.getByLabelText(/course.maxGradeIfMinNotReached/i), { target: { value: 5 } });

    const selects = await screen.findAllByRole("combobox");

    fireEvent.mouseDown(selects[0]);
    let listbox = await screen.findByRole("listbox");
    const mathOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Math");
    fireEvent.click(mathOption);

    fireEvent.mouseDown(selects[1]);
    listbox = await screen.findByRole("listbox");
    const yearOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "2025/26");
    fireEvent.click(yearOption);

    fireEvent.mouseDown(selects[2]);
    listbox = await screen.findByRole("listbox");
    const programOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Program 1");
    fireEvent.click(programOption);

    const totalWeightInputs = screen.getAllByLabelText(/course.totalWeight/i);
    fireEvent.change(totalWeightInputs[0], { target: { value: 100 } });

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("course.success.created"))).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/course.maxGradeIfMinNotReached/i), { target: { value: 5 } });

    const selects = await screen.findAllByRole("combobox");

    fireEvent.mouseDown(selects[0]);
    let listbox = await screen.findByRole("listbox");
    const mathOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Math");
    fireEvent.click(mathOption);

    fireEvent.mouseDown(selects[1]);
    listbox = await screen.findByRole("listbox");
    const yearOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "2025/26");
    fireEvent.click(yearOption);

    fireEvent.mouseDown(selects[2]);
    listbox = await screen.findByRole("listbox");
    const programOption = within(listbox).getAllByRole("option").find(opt => opt.textContent === "Program 1");
    fireEvent.click(programOption);

    fireEvent.change(screen.getByLabelText(/course.totalWeight/i), { target: { value: 100 } });

    const submitButton = await screen.findByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("error.serverError"))).toBeInTheDocument();
    });
  });

  it("loads existing course in edit mode", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "c1" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/subjects/by-university/uni1`)
      .reply(200, { subjects: [{ _id: "s1", name: "Math", studyPrograms: ["sp1"], evaluationPolicyId: "ep1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`)
      .reply(200, { years: [{ _id: "y1", yearLabel: "2025/26" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`)
      .reply(200, { programs: [{ _id: "sp1", name: "Program 1" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`)
      .reply(200, { evaluationTypes: [{ _id: "et1", name: "Exam" }] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/c1`)
      .reply(200, { 
        course: {
          _id: "c1",
          name: "Math Course",
          code: "MATH01",
          subjectId: { _id: "s1", name: "Math", evaluationPolicyId: "ep1" },
          academicYearId: { _id: "y1" },
          studyProgramId: { _id: "sp1" },
          maxGrade: 7
        },
        system: { evaluationGroups: [{ evaluationTypeId: "et1", totalWeight: 50 }] }
      });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-policies/ep1`)
      .reply(200, { policy: { policyRules: [{ evaluationTypeId: "et1", minPercentage: 0, maxPercentage: 100 }] } });
    mockAxios.onPut(`${GATEWAY_URL}/academic/courses/c1`).reply(200, { success: true });

    renderWithContext(<CourseForm />);

    await waitFor(() => expect(screen.getByDisplayValue("Math Course")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByDisplayValue("MATH01")).toBeInTheDocument());
  });

  it("shows error alert if initial fetch fails", async () => {
    ReactRouter.useParams.mockReturnValue({});
    mockAxios.onGet(`${GATEWAY_URL}/academic/subjects/by-university/uni1`).reply(500, { errorKey: "serverError" });
    mockAxios.onGet(/academic\/academicYears/).reply(200, { years: [] });
    mockAxios.onGet(/academic\/evaluation-types/).reply(200, { evaluationTypes: [] });
    mockAxios.onGet(/academic\/studyPrograms/).reply(200, { programs: [] });

    renderWithContext(<CourseForm />);

    await waitFor(() => {
      expect(screen.getByText("error.serverError")).toBeInTheDocument();
    });
  });

  it("shows error if total weight is not 100", async () => {
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

    fireEvent.change(screen.getByLabelText(/course.name/i), { target: { value: "Mates" } });
    fireEvent.change(screen.getByLabelText(/course.code/i), { target: { value: "MAT01" } });
    fireEvent.change(screen.getByLabelText(/course.maxGradeIfMinNotReached/i), { target: { value: 5 } });

    const selects = await screen.findAllByRole("combobox");
    fireEvent.mouseDown(selects[0]);
    fireEvent.click(await screen.findByText("Math"));

    fireEvent.mouseDown(selects[1]);
    fireEvent.click(await screen.findByText("2025/26"));

    fireEvent.mouseDown(selects[2]);
    fireEvent.click(await screen.findByText("Program 1"));

    const totalWeightInput = screen.getByLabelText(/course.totalWeight/i);
    fireEvent.change(totalWeightInput, { target: { value: 50 } });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /create/i })));

    await waitFor(() => {
      expect(screen.getByText(/course.error.totalWeightNot100/i)).toBeInTheDocument();
    });
  });

  it("deletes course successfully when confirmed", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "c1" });
    jest.spyOn(window, "confirm").mockReturnValue(true);

    mockAxios.onGet(/subjects/).reply(200, { subjects: [] });
    mockAxios.onGet(/academicYears/).reply(200, { years: [] });
    mockAxios.onGet(/studyPrograms/).reply(200, { programs: [] });
    mockAxios.onGet(/evaluation-types/).reply(200, { evaluationTypes: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/c1`)
      .reply(200, { course: {}, system: {} });
    mockAxios.onDelete(`${GATEWAY_URL}/academic/courses/c1`).reply(200, {});

    renderWithContext(<CourseForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument());

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /delete/i })));

    await waitFor(() => {
      expect(screen.getByText(/course.success.deleted/i)).toBeInTheDocument();
    });
  });

  it("filters study programs when subject changes", async () => {
    ReactRouter.useParams.mockReturnValue({});

    const subjects = [
      { _id: "s1", name: "Math", studyPrograms: ["sp1"] },
      { _id: "s2", name: "Physics", studyPrograms: ["sp2"] },
    ];
    const programs = [
      { _id: "sp1", name: "Program 1" },
      { _id: "sp2", name: "Program 2" },
    ];

    mockAxios.onGet(/subjects/).reply(200, { subjects });
    mockAxios.onGet(/academicYears/).reply(200, { years: [] });
    mockAxios.onGet(/evaluation-types/).reply(200, { evaluationTypes: [] });
    mockAxios.onGet(/studyPrograms/).reply(200, { programs });

    renderWithContext(<CourseForm />);
    await waitFor(() => expect(screen.getByText("course.createTitle")).toBeInTheDocument());

    const subjectSelect = screen.getAllByRole("combobox")[0];
    fireEvent.mouseDown(subjectSelect);
    fireEvent.click(await screen.findByText("Math"));

    const programSelect = screen.getAllByRole("combobox")[2];
    fireEvent.mouseDown(programSelect);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Program 1")).toBeInTheDocument();
    expect(within(listbox).queryByText("Program 2")).not.toBeInTheDocument();
  });
});
