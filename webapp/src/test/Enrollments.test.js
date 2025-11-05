import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
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

  test("changes rows per page and resets page", async () => {
    const manyEnrollments = Array.from({ length: 10 }, (_, i) => ({
      _id: `en${i}`,
      account: {
        email: `user${i}@example.com`,
        userId: {
          name: `User${i}`,
          firstSurname: `Lastname${i}`,
          secondSurname: "",
          identityNumber: `ID${i}`,
        },
      },
      studyProgramId: { _id: `p${i}`, name: `Program ${i}` },
      academicYearId: { _id: `y${i}`, yearLabel: `2024/2025` },
    }));

    const mockPrograms = manyEnrollments.map((e) => e.studyProgramId);
    const mockYears = manyEnrollments.map((e) => e.academicYearId);

    axios.get.mockResolvedValueOnce({ data: { enrollments: manyEnrollments } });
    axios.get.mockResolvedValueOnce({ data: { programs: mockPrograms } });
    axios.get.mockResolvedValueOnce({ data: { years: mockYears } });

    renderWithProviders(<Enrollments />);

    await waitFor(() => expect(screen.getByText("User0 Lastname0")).toBeInTheDocument());

    expect(screen.queryByText("User7 Lastname7")).not.toBeInTheDocument();

    const pagination = screen.getByTestId("rows-per-page");
    const selectTrigger = within(pagination).getByRole("combobox");

    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByRole("option", { name: "10" });
    fireEvent.click(option);

    expect(selectTrigger).toHaveTextContent("10");

    await waitFor(() => expect(screen.getByText("User7 Lastname7")).toBeInTheDocument());
  });

  test("imports CSV and refreshes data", async () => {
    const mockFile = new File(["name;email\nJohn;test@example.com"], "test.csv", { type: "text/csv" });

    axios.get.mockResolvedValueOnce({ data: { enrollments: [] } });
    axios.get.mockResolvedValueOnce({ data: { programs: [] } });
    axios.get.mockResolvedValueOnce({ data: { years: [] } });
    axios.post.mockResolvedValueOnce({ data: { errors: [] } });
    axios.get.mockResolvedValueOnce({ data: { enrollments: [] } }); 

    renderWithProviders(<Enrollments />);
    await waitFor(() => expect(screen.getByTestId("enrollments-list-page")).toBeInTheDocument());

    const fileInput = screen.getByTestId("enrollments-file-input");
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
  });
});
