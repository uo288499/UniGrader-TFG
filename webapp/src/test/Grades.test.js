import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import Grades from "../pages/grades/Grades";
import { SessionContext } from "../SessionContext";

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
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

describe("Grades Page", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  it("renders loading spinner initially", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "student1" });

    renderWithContext(<Grades />);
    expect(screen.getByTestId("grades-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("loads and displays grades table", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "student1" });

    mockAxios.onGet(`${GATEWAY_URL}/grade/final-grades/by-student/student1`).reply(200, {
      grades: [
        { _id: "g1", courseId: "c1", evaluationPeriod: "Ordinary", value: 7, isPassed: true },
      ],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", academicYearId: { _id: "ay1", yearLabel: "2024/25" }, studyProgramId: { _id: "sp1", name: "Engineering" } }],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, {
      evaluationTypes: [],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/by-student/student1`).reply(200, { groups: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`).reply(200, { years: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`).reply(200, { programs: [] });

    await act(async () => renderWithContext(<Grades />));

    await waitFor(() => {
      expect(screen.getByText(/Math/)).toBeInTheDocument();
      expect(screen.getByText("7.00")).toBeInTheDocument();
      expect(screen.getByText(/Passed/)).toBeInTheDocument();
    });
  });

  it("applies text filter correctly", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "student1" });

    mockAxios.onGet(`${GATEWAY_URL}/grade/final-grades/by-student/student1`).reply(200, {
      grades: [
        { _id: "g1", courseId: "c1", evaluationPeriod: "Ordinary", value: 7, isPassed: true },
        { _id: "g2", courseId: "c2", evaluationPeriod: "Ordinary", value: 5, isPassed: false },
      ],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [
        { _id: "c1", name: "Math", academicYearId: { _id: "ay1", yearLabel: "2024/25" }, studyProgramId: { _id: "sp1", name: "Engineering" } },
        { _id: "c2", name: "Physics", academicYearId: { _id: "ay1", yearLabel: "2024/25" }, studyProgramId: { _id: "sp1", name: "Engineering" } },
      ],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, { evaluationTypes: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/by-student/student1`).reply(200, { groups: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`).reply(200, { years: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`).reply(200, { programs: [] });

    await act(async () => renderWithContext(<Grades />));

    const courseFilter = screen.getByLabelText(/course.name/);
    fireEvent.change(courseFilter, { target: { value: "Math" } });

    await waitFor(() => {
      expect(screen.getByText(/Math/)).toBeInTheDocument();
      expect(screen.queryByText(/Physics/)).not.toBeInTheDocument();
    });
  });

  it("expands course details on click and loads system info", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "student1" });

    mockAxios.onGet(`${GATEWAY_URL}/grade/final-grades/by-student/student1`).reply(200, {
      grades: [{ _id: "g1", courseId: "c1", evaluationPeriod: "Ordinary", value: 7, isPassed: true }],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/by-university/uni1`).reply(200, {
      courses: [{ _id: "c1", name: "Math", academicYearId: { _id: "ay1", yearLabel: "2024/25" }, studyProgramId: { _id: "sp1", name: "Engineering" } }],
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, { evaluationTypes: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/by-student/student1`).reply(200, { groups: [{ _id: "grp1", courseId: { _id: "c1" } }] });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-systems/by-course/c1`).reply(200, { system: { evaluationGroups: [] } });
    mockAxios.onGet(`${GATEWAY_URL}/grade/grades/by-student/student1`).reply(200, { grades: [] });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-items/by-group/grp1`).reply(200, { items: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/academicYears/by-university/uni1`).reply(200, { years: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/studyPrograms/by-university/uni1`).reply(200, { programs: [] });

    await act(async () => renderWithContext(<Grades />));

    const row = screen.getByText(/Math/).closest("tr");
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText(/grades.noEvaluationSystem/)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "student1" });

    mockAxios.onGet(/.*/).reply(500);

    await act(async () => renderWithContext(<Grades />));

    await waitFor(() => {
      expect(screen.getByTestId("grades-page")).toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });
});
