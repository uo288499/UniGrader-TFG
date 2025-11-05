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

  it("loads evaluation type data when editing", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "et123" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200, {
      evaluationType: {
        _id: "et123",
        universityId: { _id: "uni1" },
        name: "Exam"
      }
    });

    renderWithContext(<EvaluationTypeForm />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Exam")).toBeInTheDocument();
    });
  });

  it("redirects to not-found if evaluation type belongs to another university", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "et123" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200, {
      evaluationType: {
        _id: "et123",
        universityId: { _id: "otherUni" },
        name: "Exam"
      }
    });

    renderWithContext(<EvaluationTypeForm />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/not-found");
    });
  });

  it("updates an existing evaluation type successfully", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "et123" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200, {
      evaluationType: { _id: "et123", universityId: { _id: "uni1" }, name: "Old Exam" }
    });

    mockAxios.onPut(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200, {});

    renderWithContext(<EvaluationTypeForm />);
    await waitFor(() => screen.getByDisplayValue("Old Exam"));

    fireEvent.change(screen.getByLabelText(/evaluationTypes.name/i), { target: { value: "Updated Exam" } });
    const submitButton = screen.getByRole("button", { name: /update/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/evaluationTypes.success.updated/i)).toBeInTheDocument();
    });
  });

  it("handles delete confirmation and success", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "et123" });
    jest.spyOn(window, "confirm").mockReturnValue(true);

    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200, {
      evaluationType: { _id: "et123", universityId: { _id: "uni1" }, name: "Exam" }
    });

    mockAxios.onDelete(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200);

    renderWithContext(<EvaluationTypeForm />);
    await waitFor(() => screen.getByDisplayValue("Exam"));

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await act(async () => fireEvent.click(deleteButton));

    await waitFor(() => {
      expect(screen.getByText(/evaluationTypes.success.deleted/i)).toBeInTheDocument();
    });
  });

  it("handles delete cancel", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "et123" });
    jest.spyOn(window, "confirm").mockReturnValue(false);

    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/et123`).reply(200, {
      evaluationType: { _id: "et123", universityId: { _id: "uni1" }, name: "Exam" }
    });

    renderWithContext(<EvaluationTypeForm />);
    await waitFor(() => screen.getByDisplayValue("Exam"));

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await act(async () => fireEvent.click(deleteButton));

    expect(mockNavigate).not.toHaveBeenCalledWith("/evaluation-types");
  });

  it("validates name length constraints", async () => {
    ReactRouter.useParams.mockReturnValue({});
    renderWithContext(<EvaluationTypeForm />);

    const nameInput = screen.getByLabelText(/evaluationTypes.name/i);

    fireEvent.change(nameInput, { target: { value: "Ex" } });
    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => fireEvent.click(submitButton));
    await waitFor(() => expect(screen.getByText(/evaluationTypes.error.nameLength/i)).toBeInTheDocument());

    fireEvent.change(nameInput, { target: { value: "E".repeat(201) } });
    await act(async () => fireEvent.click(submitButton));
    await waitFor(() => expect(screen.getByText(/evaluationTypes.error.nameMax/i)).toBeInTheDocument());
  });
});
