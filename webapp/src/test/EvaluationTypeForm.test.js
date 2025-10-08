import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router"; 
import EvaluationTypeForm from "../pages/evaluationTypes/EvaluationTypeForm";
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

describe("EvaluationTypeForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("validates required name field", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<EvaluationTypeForm />);

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/evaluationTypes.error.nameRequired/i)).toBeInTheDocument();
    });
  });

  it("submits form successfully", async () => {
    ReactRouter.useParams.mockReturnValue({});

    mockAxios.onPost(`${GATEWAY_URL}/academic/evaluation-types`).reply(200, {
      evaluationType: { _id: "et123", name: "Exam" },
    });

    renderWithContext(<EvaluationTypeForm />);
    fireEvent.change(screen.getByLabelText(/evaluationTypes.name/i), { target: { value: "Exam" } });

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/evaluationTypes.success.created/i)).toBeInTheDocument();
    });
  });
});
