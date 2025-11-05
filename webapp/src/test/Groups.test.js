import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import Groups from "../pages/groups/Groups";
import axios from "axios";
import { SessionContext } from "../SessionContext";
import { BrowserRouter } from "react-router";

jest.mock("axios");

const renderWithProviders = (ui, { universityID = "uni1" } = {}) => {
  return render(
    <BrowserRouter>
      <SessionContext.Provider value={{ universityID }}>
        {ui}
      </SessionContext.Provider>
    </BrowserRouter>
  );
};

describe("Groups Page", () => {
  const mockGroups = [
    { _id: "g1", name: "Group A", courseId: { _id: "c1", name: "Calculus" } },
    { _id: "g2", name: "Group B", courseId: { _id: "c2", name: "Physics 1" } },
  ];

  const mockCourses = [
    { _id: "c1", name: "Calculus", academicYearId: { yearLabel: "2024/2025" } },
    { _id: "c2", name: "Physics 1", academicYearId: { yearLabel: "2024/2025" } },
  ];

  beforeEach(() => {
    axios.get.mockReset();
  });

  test("renders loading spinner initially", async () => {
    axios.get.mockResolvedValueOnce({ data: { groups: [], courses: [] } });

    renderWithProviders(<Groups />);
    expect(screen.getByTestId("groups-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  test("renders groups after loading", async () => {
    axios.get.mockResolvedValueOnce({ data: { groups: mockGroups } });
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });

    renderWithProviders(<Groups />);

    await waitFor(() => {
      expect(screen.getByText("Group A")).toBeInTheDocument();
      expect(screen.getByText("Group B")).toBeInTheDocument();
    });
  });

  test("filters groups by name", async () => {
    axios.get.mockResolvedValueOnce({ data: { groups: mockGroups } });
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });

    renderWithProviders(<Groups />);
    await waitFor(() => screen.getByText("Group A"));

    const nameInput = screen.getByLabelText(/group.name/i);
    fireEvent.change(nameInput, { target: { value: "B" } });

    await waitFor(() => {
      expect(screen.getByText("Group B")).toBeInTheDocument();
    });
  });

  test("filters groups by course", async () => {
    axios.get.mockResolvedValueOnce({ data: { groups: mockGroups } });
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });

    renderWithProviders(<Groups />);
    await waitFor(() => screen.getByText("Group A"));

    const selects = screen.getAllByRole("combobox");
    const courseSelect = selects[1];
    fireEvent.mouseDown(courseSelect);

    const option = await screen.findByText("Calculus - 2024/2025");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText("Group A")).toBeInTheDocument();
    });
  });

  test("edit button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { groups: mockGroups } });
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });

    renderWithProviders(<Groups />);
    await waitFor(() => screen.getByText("Group A"));

    const editButton = screen.getByTestId("edit-button-g1");
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/groups/g1");
  });

  test("create button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { groups: mockGroups } });
    axios.get.mockResolvedValueOnce({ data: { courses: mockCourses } });

    renderWithProviders(<Groups />);
    await waitFor(() => screen.getByText("Group A"));

    const createButton = screen.getByText(/group.new/i);
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith("/groups/new");
  });
  
  test("changes rows per page and resets page", async () => {
    const manyGroups = Array.from({ length: 10 }, (_, i) => ({
      _id: `g${i}`,
      name: `Group ${i}`,
      courseId: { _id: `c${i}`, name: `Course ${i}` },
    }));

    const manyCourses = manyGroups.map((g) => ({
      _id: g.courseId._id,
      name: g.courseId.name,
      academicYearId: { yearLabel: "2024/2025" },
    }));

    axios.get.mockResolvedValueOnce({ data: { groups: manyGroups } });
    axios.get.mockResolvedValueOnce({ data: { courses: manyCourses } });

    renderWithProviders(<Groups />);

    await waitFor(() => expect(screen.getByText("Group 0")).toBeInTheDocument());

    expect(screen.queryByText("Group 7")).not.toBeInTheDocument();

    const pagination = screen.getByTestId("rows-per-page");
    const selectTrigger = within(pagination).getByRole("combobox");

    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByRole("option", { name: "10" });
    fireEvent.click(option);

    expect(selectTrigger).toHaveTextContent("10");

    await waitFor(() => expect(screen.getByText("Group 7")).toBeInTheDocument());
  });
});
