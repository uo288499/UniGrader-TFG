import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EvaluationTypes from "../pages/evaluationTypes/EvaluationTypes";
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

describe("EvaluationTypes Page", () => {
  const mockData = [
    { _id: "e1", name: "Exam" },
    { _id: "e2", name: "Project" },
    { _id: "e3", name: "Quiz" },
  ];

  beforeEach(() => {
    axios.get.mockReset();
  });

  test("renders loading spinner initially", async () => {
    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: [] } });

    renderWithProviders(<EvaluationTypes />);
    expect(screen.getByTestId("evaluationtypes-list-page")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  test("renders evaluation types after loading", async () => {
    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: mockData } });

    renderWithProviders(<EvaluationTypes />);

    for (const type of mockData) {
      await waitFor(() => {
        expect(screen.getByText(type.name)).toBeInTheDocument();
      });
    }
  });

  test("filters evaluation types by name", async () => {
    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: mockData } });

    renderWithProviders(<EvaluationTypes />);
    await waitFor(() => screen.getByText("Exam"));

    const input = screen.getByLabelText(/evaluationTypes.name/i);
    fireEvent.change(input, { target: { value: "Proj" } });

    await waitFor(() => {
      expect(screen.getByText("Project")).toBeInTheDocument();
      expect(screen.queryByText("Exam")).not.toBeInTheDocument();
      expect(screen.queryByText("Quiz")).not.toBeInTheDocument();
    });
  });

  test("resets filters", async () => {
    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: mockData } });

    renderWithProviders(<EvaluationTypes />);
    await waitFor(() => screen.getByText("Exam"));

    const input = screen.getByLabelText(/evaluationTypes.name/i);
    fireEvent.change(input, { target: { value: "Proj" } });

    const resetButton = screen.getByText(/resetFilters/i);
    fireEvent.click(resetButton);

    await waitFor(() => {
      for (const type of mockData) {
        expect(screen.getByText(type.name)).toBeInTheDocument();
      }
    });
  });

  test("edit button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: mockData } });

    renderWithProviders(<EvaluationTypes />);
    await waitFor(() => screen.getByText("Exam"));

    const editButton = screen.getByTestId("edit-button-e1");
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/evaluation-types/e1");
  });

  test("create button navigates", async () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require("react-router"), "useNavigate").mockReturnValue(mockNavigate);

    axios.get.mockResolvedValueOnce({ data: { evaluationTypes: mockData } });

    renderWithProviders(<EvaluationTypes />);
    await waitFor(() => screen.getByText("Exam"));

    const createButton = screen.getByText(/evaluationTypes.new/i);
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith("/evaluation-types/new");
  });
});
