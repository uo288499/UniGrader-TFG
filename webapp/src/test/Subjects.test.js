import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Subjects from "../pages/subjects/Subjects";
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

describe("Subjects Page", () => {
  const mockSubjects = [
    { _id: "s1", name: "Math", code: "MATH101", studyPrograms: ["sp1"] },
    { _id: "s2", name: "Physics", code: "PHYS101", studyPrograms: ["sp2"] },
  ];

  const mockStudyPrograms = [
    { _id: "sp1", name: "Engineering" },
    { _id: "sp2", name: "Science" },
  ];

  beforeEach(() => {
    axios.get.mockReset();
  });

  test("renders loading spinner initially", async () => {
    axios.get.mockResolvedValueOnce({ data: { subjects: [], programs: [] } });

    renderWithProviders(<Subjects />);
    expect(screen.getByTestId("subjects-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  test("renders subjects after loading", async () => {
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Subjects />);

    await waitFor(() => {
      expect(screen.getByText("Math")).toBeInTheDocument();
      expect(screen.getByText("Physics")).toBeInTheDocument();
    });
  });

  test("filters subjects by name", async () => {
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Subjects />);
    await waitFor(() => screen.getByText("Math"));

    const nameInput = screen.getByLabelText(/subject.name/i);
    fireEvent.change(nameInput, { target: { value: "Physics" } });

    await waitFor(() => {
      expect(screen.getByText("Physics")).toBeInTheDocument();
    });
  });

  test("filters subjects by code", async () => {
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Subjects />);
    await waitFor(() => screen.getByText("Math"));

    const codeInput = screen.getByLabelText(/subject.code/i);
    fireEvent.change(codeInput, { target: { value: "PHYS101" } });

    await waitFor(() => {
      expect(screen.getByText("Physics")).toBeInTheDocument();
    });
  });

  test("filters subjects by study program", async () => {
    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Subjects />);
    await waitFor(() => screen.getByText("Math"));

    const selects = screen.getAllByRole("combobox");
    const spSelect = selects[0];
    fireEvent.mouseDown(spSelect);

    const option = await screen.findByText("Engineering");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText("Math")).toBeInTheDocument();
    });
  });

  test("edit button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Subjects />);
    await waitFor(() => screen.getByText("Math"));

    const editButton = screen.getByTestId("edit-button-s1");
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/subjects/s1");
  });

  test("create button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { subjects: mockSubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockStudyPrograms } });

    renderWithProviders(<Subjects />);
    await waitFor(() => screen.getByText("Math"));

    const createButton = screen.getByText(/subject.new/i);
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith("/subjects/new");
  });

  test("handles pagination change", async () => {
    const subjects = Array.from({ length: 12 }, (_, i) => ({
      _id: `s${i}`,
      name: `Subject ${i}`,
      code: `CODE${i}`,
      studyPrograms: ["sp1"],
    }));

    const programs = [{ _id: "sp1", name: "Engineering" }];

    axios.get.mockResolvedValueOnce({ data: { subjects } });
    axios.get.mockResolvedValueOnce({ data: { programs } });

    renderWithProviders(<Subjects />);
    await waitFor(() => expect(screen.getByText("Subject 0")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Go to next page"));

    expect(screen.getByText("Subject 5")).toBeInTheDocument();
  });

  test("changes rows per page and resets page", async () => {
    const manySubjects = Array.from({ length: 12 }, (_, i) => ({
      _id: `s${i}`,
      name: `Subject ${i}`,
      code: `CODE${i}`,
      studyPrograms: ["sp1"],
    }));

    const programs = [{ _id: "sp1", name: "Engineering" }];

    axios.get.mockResolvedValueOnce({ data: { subjects: manySubjects } });
    axios.get.mockResolvedValueOnce({ data: { programs } });

    renderWithProviders(<Subjects />);

    await waitFor(() => expect(screen.getByText("Subject 0")).toBeInTheDocument());
    expect(screen.queryByText("Subject 7")).not.toBeInTheDocument();

    const pagination = screen.getByTestId("rows-per-page");
    const selectTrigger = within(pagination).getByRole("combobox");

    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByRole("option", { name: "10" });
    fireEvent.click(option);

    expect(selectTrigger).toHaveTextContent("10");

    await waitFor(() => expect(screen.getByText("Subject 7")).toBeInTheDocument());
  });
});
