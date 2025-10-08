import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router"; 
import StudyProgramForm from "../pages/studyPrograms/StudyProgramForm";
import { SessionContext } from "../SessionContext";

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

describe("StudyProgramForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required fields", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<StudyProgramForm />);

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/studyPrograms.error.nameRequired/i)).toBeInTheDocument();
      expect(screen.getByText(/studyPrograms.error.typeRequired/i)).toBeInTheDocument();
    });
  });

  it("submits form successfully", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onPost(`${GATEWAY_URL}/academic/studyprograms`).reply(200, {
      program: { _id: "sp123", name: "Engineering" },
    });

    renderWithContext(<StudyProgramForm />);
    fireEvent.change(screen.getByLabelText(/studyPrograms.name/i), { target: { value: "Engineering" } });
    
    const typeSelect = screen.getByRole("combobox");
    fireEvent.mouseDown(typeSelect);
    fireEvent.click(screen.getByText(/studyPrograms.types.Bachelor/i));

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/studyPrograms.success.created/i)).toBeInTheDocument();
    });
  });
});
