import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import StudyPrograms from "../pages/studyPrograms/StudyPrograms";
import axios from "axios";
import { BrowserRouter } from "react-router";
import { SessionContext } from "../SessionContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

jest.mock("axios");

const renderWithProviders = (ui, { universityID = "u123" } = {}) => {
  return render(
    <BrowserRouter>
      <SessionContext.Provider value={{ universityID }}>
        {ui}
      </SessionContext.Provider>
    </BrowserRouter>
  );
};

describe("StudyPrograms Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { programs: [] } }); 
    });

  test("renders loading state initially", () => {
    renderWithProviders(<StudyPrograms />);
    expect(screen.getByTestId("studyprograms-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("renders study programs after fetch", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        programs: [
          { _id: "p1", name: "Software Engineering", type: "Bachelor" },
        ],
      },
    });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("Software Engineering")).toBeInTheDocument()
    );
    expect(axios.get).toHaveBeenCalledWith(
      "http://localhost:8000/academic/studyprograms/by-university/u123"
    );
  });

  test("shows noResults when no programs", async () => {
    axios.get.mockResolvedValueOnce({ data: { programs: [] } });
    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("noResults")).toBeInTheDocument()
    );
  });

  test("handles API error gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network Error"));
    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("noResults")).toBeInTheDocument()
    );
  });

  test("filters by name", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        programs: [
          { _id: "p1", name: "Software Engineering", type: "Bachelor" },
          { _id: "p2", name: "Data Science", type: "Master" },
        ],
      },
    });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("Software Engineering")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText("studyPrograms.name"), {
      target: { value: "Data" },
    });

    expect(screen.queryByText("Software Engineering")).not.toBeInTheDocument();
    expect(screen.getByText("Data Science")).toBeInTheDocument();
  });

  test("filters by type", async () => {
    axios.get.mockResolvedValueOnce({
        data: {
        programs: [
            { _id: "p1", name: "Software Engineering", type: "Bachelor" },
            { _id: "p2", name: "Data Science", type: "Master" },
        ],
        },
    });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
        expect(screen.getByText("Software Engineering")).toBeInTheDocument()
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.mouseDown(selects[1]); 

    const option = await screen.findByText("studyPrograms.types.Master");
    fireEvent.click(option);

    expect(screen.getByText("Data Science")).toBeInTheDocument();
  });

  test("resets filters", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        programs: [
          { _id: "p1", name: "Software Engineering", type: "Bachelor" },
        ],
      },
    });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("Software Engineering")).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText("studyPrograms.name"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("noResults")).toBeInTheDocument();

    fireEvent.click(screen.getByText("resetFilters"));
    expect(screen.getByText("Software Engineering")).toBeInTheDocument();
  });

  test("navigates to create program page", async () => {
    axios.get.mockResolvedValueOnce({ data: { programs: [] } });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("noResults")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("studyPrograms.new"));
    expect(mockNavigate).toHaveBeenCalledWith("/study-programs/new");
  });

  test("navigates to edit program page", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        programs: [
          { _id: "p1", name: "Software Engineering", type: "Bachelor" },
        ],
      },
    });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() =>
      expect(screen.getByText("Software Engineering")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("edit-button-p1"));
    expect(mockNavigate).toHaveBeenCalledWith("/study-programs/p1");
  });

  test("handles pagination change", async () => {
    const programs = Array.from({ length: 12 }, (_, i) => ({
      _id: `p${i}`,
      name: `Program ${i}`,
      type: "Bachelor",
    }));

    axios.get.mockResolvedValueOnce({ data: { programs } });

    renderWithProviders(<StudyPrograms />);
    await waitFor(() => expect(screen.getByText("Program 0")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Go to next page"));
    expect(screen.getByText("Program 5")).toBeInTheDocument();
  });

  test("changes rows per page and resets page", async () => {
    const manyPrograms = Array.from({ length: 12 }, (_, i) => ({
      _id: `p${i}`,
      name: `Program ${i}`,
      type: "Bachelor",
    }));

    axios.get.mockResolvedValueOnce({ data: { programs: manyPrograms } });

    renderWithProviders(<StudyPrograms />);

    await waitFor(() => expect(screen.getByText("Program 0")).toBeInTheDocument());
    expect(screen.queryByText("Program 7")).not.toBeInTheDocument(); 

    const pagination = screen.getByTestId("rows-per-page");
    const selectTrigger = within(pagination).getByRole("combobox");

    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByRole("option", { name: "10" });
    fireEvent.click(option);

    expect(selectTrigger).toHaveTextContent("10");

    await waitFor(() => expect(screen.getByText("Program 7")).toBeInTheDocument());
  });
});
