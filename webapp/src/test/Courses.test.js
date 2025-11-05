import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Courses from "../pages/courses/Courses";
import axios from "axios";
import { SessionContext } from "../SessionContext";
import { BrowserRouter } from "react-router";

jest.mock("axios");

const renderWithProviders = (ui, { sessionUniversity = "uni1" } = {}) => {
  return render(
    <BrowserRouter>
      <SessionContext.Provider value={{ universityID: sessionUniversity }}>
        {ui}
      </SessionContext.Provider>
    </BrowserRouter>
  );
};

describe("Courses Page", () => {
  const mockCourses = [
    { _id: "c1", name: "Calculus", code: "MATH101", subjectId: { _id: "s1", name: "Math" }, academicYearId: { _id: "y1", yearLabel: "2024/25" }, studyProgramId: { _id: "sp1", name: "Engineering" } },
    { _id: "c2", name: "Physics 1", code: "PHYS101", subjectId: { _id: "s2", name: "Physics" }, academicYearId: { _id: "y2", yearLabel: "2024/25" }, studyProgramId: { _id: "sp2", name: "Science" } },
  ];

  const mockSubjects = [
    { _id: "s1", name: "Math" },
    { _id: "s2", name: "Physics" },
  ];

  const mockAcademicYears = [
    { _id: "y1", yearLabel: "2024/25" },
    { _id: "y2", yearLabel: "2024/25" },
  ];

  const mockStudyPrograms = [
    { _id: "sp1", name: "Engineering" },
    { _id: "sp2", name: "Science" },
  ];

  beforeEach(() => {
    axios.get.mockReset();
  });

  test("renders loading spinner initially", async () => {
    axios.get.mockResolvedValueOnce({ data: { courses: [], subjects: [], years: [], programs: [] } });

    renderWithProviders(<Courses />);
    expect(screen.getByTestId("courses-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  test("renders courses after loading", async () => {
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);

    await waitFor(() => {
      expect(screen.getByText("Calculus")).toBeInTheDocument();
      expect(screen.getByText("Physics 1")).toBeInTheDocument();
    });
  });

  test("filters courses by name", async () => {
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);
    await waitFor(() => screen.getByText("Calculus"));

    const nameInput = screen.getByLabelText(/course.name/i);
    fireEvent.change(nameInput, { target: { value: "Physics" } });

    await waitFor(() => {
      expect(screen.getByText("Physics 1")).toBeInTheDocument();
    });
  });

  test("filters courses by code", async () => {
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);
    await waitFor(() => screen.getByText("Calculus"));

    const codeInput = screen.getByLabelText(/course.code/i);
    fireEvent.change(codeInput, { target: { value: "PHYS101" } });

    await waitFor(() => {
      expect(screen.getByText("Physics 1")).toBeInTheDocument();
    });
  });

  test("filters courses by subject", async () => {
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);
    await waitFor(() => screen.getByText("Calculus"));

    const selects = screen.getAllByRole("combobox");
    const subjectSelect = selects[1];
    fireEvent.mouseDown(subjectSelect);

    const option = await screen.findByText("Math");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText("Calculus")).toBeInTheDocument();
    });
  });

  test("edit button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);
    await waitFor(() => screen.getByText("Calculus"));

    const editButton = screen.getByTestId("edit-button-c1");
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/courses/c1");
  });

  test("create button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);
    await waitFor(() => screen.getByText("Calculus"));

    const createButton = screen.getByText(/course.new/i);
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith("/courses/new");
  });

  test("changes rows per page and resets page", async () => {
    const manyCourses = Array.from({ length: 10 }, (_, i) => ({
      _id: `c${i}`,
      name: `Course ${i}`,
      code: `CODE${i}`,
      subjectId: { _id: `s${i}`, name: `Subject ${i}` },
      academicYearId: { _id: `y${i}`, yearLabel: `2024/25` },
      studyProgramId: { _id: `sp${i}`, name: `Program ${i}` },
    }));

    const mockSubjects = manyCourses.map((c) => c.subjectId);
    const mockAcademicYears = manyCourses.map((c) => c.academicYearId);
    const mockStudyPrograms = manyCourses.map((c) => c.studyProgramId);

    axios.get.mockResolvedValueOnce({ data: { courses: manyCourses } });
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { years: mockAcademicYears } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Courses />);

    await waitFor(() => expect(screen.getByText("Course 0")).toBeInTheDocument());

    expect(screen.queryByText("Course 7")).not.toBeInTheDocument();

    const pagination = screen.getByTestId("rows-per-page");
    const selectTrigger = within(pagination).getByRole("combobox");

    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByRole("option", { name: "10" });
    fireEvent.click(option);

    expect(selectTrigger).toHaveTextContent("10");

    await waitFor(() => expect(screen.getByText("Course 7")).toBeInTheDocument());
  });
});
