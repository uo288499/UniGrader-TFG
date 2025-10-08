import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import AcademicYears from "../pages/academicYears/AcademicYears";
import axios from "axios";
import { BrowserRouter } from "react-router";
import { SessionContext } from "../SessionContext";

// Mock i18n
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

jest.mock("axios");

// Utilidad de render con sesión universitaria válida
const renderWithProviders = (ui, { universityID = "u123" } = {}) => {
  return render(
    <BrowserRouter>
      <SessionContext.Provider value={{ universityID }}>
        {ui}
      </SessionContext.Provider>
    </BrowserRouter>
  );
};

describe("AcademicYears Page", () => {
  // Silenciamos errores para evitar "Cannot log after tests are done"
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test("renders loading state initially", () => {
    renderWithProviders(<AcademicYears />);
    expect(screen.getByTestId("academicyears-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("renders academic years after fetch", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        years: [
          {
            _id: "y1",
            yearLabel: "2023/2024",
            startDate: "2023-09-01",
            endDate: "2024-06-30",
          },
        ],
      },
    });

    renderWithProviders(<AcademicYears />);

    await waitFor(() =>
      expect(screen.getByText("2023/2024")).toBeInTheDocument()
    );
    expect(axios.get).toHaveBeenCalledWith(
      "http://localhost:8000/academic/academicyears/by-university/u123"
    );
  });

  test("shows noResults when no years", async () => {
    axios.get.mockResolvedValueOnce({ data: { years: [] } });

    renderWithProviders(<AcademicYears />);
    await waitFor(() =>
      expect(screen.getByText("noResults")).toBeInTheDocument()
    );
    await new Promise((r) => setTimeout(r, 0));
  });

  test("handles API error gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network Error"));

    renderWithProviders(<AcademicYears />);
    await waitFor(() =>
      expect(screen.getByText("noResults")).toBeInTheDocument()
    );
    await new Promise((r) => setTimeout(r, 0));
  });

  test("filters by yearLabel", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        years: [
          { _id: "y1", yearLabel: "2023/2024", startDate: "2023-09-01", endDate: "2024-06-30" },
          { _id: "y2", yearLabel: "2024/2025", startDate: "2024-09-01", endDate: "2025-06-30" },
        ],
      },
    });

    renderWithProviders(<AcademicYears />);
    await waitFor(() => expect(screen.getByText("2023/2024")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("academicYears.yearLabel"), {
      target: { value: "2024/2025" },
    });

    expect(screen.queryByText("2023/2024")).not.toBeInTheDocument();
    expect(screen.getByText("2024/2025")).toBeInTheDocument();
  });

  test("resets filters", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        years: [
          { _id: "y1", yearLabel: "2023/2024", startDate: "2023-09-01", endDate: "2024-06-30" },
        ],
      },
    });

    renderWithProviders(<AcademicYears />);
    await waitFor(() => expect(screen.getByText("2023/2024")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("academicYears.yearLabel"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("noResults")).toBeInTheDocument();

    fireEvent.click(screen.getByText("resetFilters"));
    expect(screen.getByText("2023/2024")).toBeInTheDocument();
  });

  test("navigates to create year page", async () => {
    axios.get.mockResolvedValueOnce({ data: { years: [] } });

    renderWithProviders(<AcademicYears />);
    await waitFor(() =>
      expect(screen.getByText("noResults")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("academicYears.new"));
    expect(mockNavigate).toHaveBeenCalledWith("/academic-years/new");
  });

  test("navigates to edit year page", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        years: [
          {
            _id: "y1",
            yearLabel: "2023/2024",
            startDate: "2023-09-01",
            endDate: "2024-06-30",
          },
        ],
      },
    });

    renderWithProviders(<AcademicYears />);
    await waitFor(() => expect(screen.getByText("2023/2024")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("edit-button-y1"));
    expect(mockNavigate).toHaveBeenCalledWith("/academic-years/y1");
  });

  test("handles pagination change", async () => {
    const years = Array.from({ length: 12 }, (_, i) => ({
      _id: `y${i}`,
      yearLabel: `Year ${i}`,
      startDate: "2023-09-01",
      endDate: "2024-06-30",
    }));

    axios.get.mockResolvedValueOnce({ data: { years } });

    renderWithProviders(<AcademicYears />);
    await waitFor(() => expect(screen.getByText("Year 0")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Go to next page"));
    expect(screen.getByText("Year 5")).toBeInTheDocument();
  });
});
