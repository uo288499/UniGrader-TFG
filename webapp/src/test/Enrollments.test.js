import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Enrollments from "../pages/enrollments/Enrollments";
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

describe("Enrollments Page", () => {
  const mockEnrollments = [
    {
      _id: "en1",
      account: {
        email: "alice@example.com",
        userId: { name: "Alice", firstSurname: "Smith", secondSurname: "", identityNumber: "123" },
      },
      studyProgramId: { _id: "p1", name: "Software Engineering" },
      academicYearId: { _id: "y1", yearLabel: "2024/2025" },
    },
    {
      _id: "en2",
      account: {
        email: "bob@example.com",
        userId: { name: "Bob", firstSurname: "Jones", secondSurname: "", identityNumber: "456" },
      },
      studyProgramId: { _id: "p2", name: "Data Science" },
      academicYearId: { _id: "y2", yearLabel: "2023/2024" },
    },
  ];

  const mockPrograms = [
    { _id: "p1", name: "Software Engineering" },
    { _id: "p2", name: "Data Science" },
  ];

  const mockYears = [
    { _id: "y1", yearLabel: "2024/2025" },
    { _id: "y2", yearLabel: "2023/2024" },
  ];

  beforeEach(() => {
    axios.get.mockReset();
  });

  test("renders loading spinner initially", async () => {
    axios.get.mockResolvedValueOnce({ data: { enrollments: [], programs: [], years: [] } });

    renderWithProviders(<Enrollments />);
    expect(screen.getByTestId("enrollments-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  test("renders enrollments after loading", async () => {
    axios.get.mockResolvedValueOnce({ data: { enrollments: mockEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });
  });

  test("filters enrollments by study program", async () => {
    axios.get.mockResolvedValueOnce({ data: { enrollments: mockEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);
    await waitFor(() => screen.getByText("Alice Smith"));

    const selects = screen.getAllByRole("combobox");
    const programSelect = selects[1]; // segundo combobox: study program
    fireEvent.mouseDown(programSelect);

    const option = await screen.findByText("Software Engineering");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
  });

  test("filters enrollments by academic year", async () => {
    axios.get.mockResolvedValueOnce({ data: { enrollments: mockEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);
    await waitFor(() => screen.getByText("Alice Smith"));

    const selects = screen.getAllByRole("combobox");
    const yearSelect = selects[2]; // tercer combobox: academic year
    fireEvent.mouseDown(yearSelect);

    const option = await screen.findByText("2023/2024");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });
  });

  test("filters by name input", async () => {
    axios.get.mockResolvedValueOnce({ data: { enrollments: mockEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);
    await waitFor(() => screen.getByText("Alice Smith"));

    const nameInput = screen.getByLabelText(/user.fullName/i);
    fireEvent.change(nameInput, { target: { value: "Bob" } });

    await waitFor(() => {
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });
  });

  test("edit button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { enrollments: mockEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);
    await waitFor(() => screen.getByText("Alice Smith"));

    const editButton = screen.getByTestId("edit-button-en1");
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/enrollments/en1");
  });

  test("create button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { enrollments: mockEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);
    await waitFor(() => screen.getByText("Alice Smith"));

    const createButton = screen.getByText(/enrollments.new/i);
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith("/enrollments/new");
  });
});
