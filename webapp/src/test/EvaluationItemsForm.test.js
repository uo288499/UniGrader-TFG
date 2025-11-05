import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import * as ReactRouter from "react-router";
import EvaluationItemsForm from "../pages/evaluationItems/EvaluationItemsForm";
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
  useTranslation: () => ({
    t: (key) => key,
    i18n: { resolvedLanguage: "en", changeLanguage: jest.fn() },
  }),
}));

const renderWithContext = (ui, { universityID = "uni1", accountID = "acc1" } = {}) =>
  render(
    <SessionContext.Provider value={{ universityID, accountID }}>
      <BrowserRouter>{ui}</BrowserRouter>
    </SessionContext.Provider>
  );

describe("EvaluationItemsForm Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  it("shows loading initially", () => {
    ReactRouter.useParams.mockReturnValue({ id: "grp1" });
    renderWithContext(<EvaluationItemsForm />);
    expect(screen.getByTestId("evaluationitems-form-page")).toBeInTheDocument();
    expect(screen.getByText(/common.loadingData/i)).toBeInTheDocument();
  });

  it("redirects to not-found if group not found", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "grp1" });
    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/grp1`).reply(200, { group: null });

    renderWithContext(<EvaluationItemsForm />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/not-found"));
  });

  it("loads group, course and evaluation system correctly", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "grp1" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/grp1`).reply(200, {
      group: { _id: "grp1", name: "Group 1", professors: ["acc1"], courseId: { _id: "course1" } },
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/course1`).reply(200, {
      course: { _id: "course1", name: "Course 1" },
      system: { _id: "sys1", evaluationGroups: [{ evaluationTypeId: "type1" }] },
    });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-items/by-group/grp1`).reply(200, { items: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, {
      evaluationTypes: [{ _id: "type1", name: "Exam" }],
    });

    renderWithContext(<EvaluationItemsForm />);
    await waitFor(() => screen.getByText("Exam"));
    expect(screen.getByText("Course 1 - Group 1")).toBeInTheDocument();
  });

  it("submits form successfully", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "grp1" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/grp1`).reply(200, {
      group: { _id: "grp1", name: "Group 1", professors: ["acc1"], courseId: { _id: "course1" } },
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/course1`).reply(200, {
      course: { _id: "course1", name: "Course 1" },
      system: { _id: "sys1", evaluationGroups: [{ evaluationTypeId: "type1" }] },
    });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-items/by-group/grp1`).reply(200, { items: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, {
      evaluationTypes: [{ _id: "type1", name: "Exam" }],
    });
    mockAxios.onPut(`${GATEWAY_URL}/eval/evaluation-items/sync/grp1`).reply(200, {
      items: [{ name: "Test Item", evaluationTypeId: "type1", weight: 100 }],
    });

    renderWithContext(<EvaluationItemsForm />);
    await waitFor(() => screen.getByText("Exam"));

    fireEvent.change(screen.getByLabelText(/evaluationItem.name/i), { target: { value: "Test Item" } });
    fireEvent.change(screen.getByLabelText(/evaluationItem.weight/i), { target: { value: 100 } });

    const submitButton = screen.getByRole("button", { name: /evaluationItem.saveChanges/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/evaluationItem.success.synced/i)).toBeInTheDocument();
    });
  });

  it("handles server error on submit", async () => {
    ReactRouter.useParams.mockReturnValue({ id: "grp1" });

    mockAxios.onGet(`${GATEWAY_URL}/academic/groups/grp1`).reply(200, {
      group: { _id: "grp1", name: "Group 1", professors: ["acc1"], courseId: { _id: "course1" } },
    });
    mockAxios.onGet(`${GATEWAY_URL}/academic/courses/course1`).reply(200, {
      course: { _id: "course1", name: "Course 1" },
      system: { _id: "sys1", evaluationGroups: [{ evaluationTypeId: "type1" }] },
    });
    mockAxios.onGet(`${GATEWAY_URL}/eval/evaluation-items/by-group/grp1`).reply(200, { items: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/evaluation-types/by-university/uni1`).reply(200, {
      evaluationTypes: [{ _id: "type1", name: "Exam" }],
    });
    mockAxios.onPut(`${GATEWAY_URL}/eval/evaluation-items/sync/grp1`).reply(500, {
      errorKey: "serverError",
    });

    renderWithContext(<EvaluationItemsForm />);
    await waitFor(() => screen.getByText("Exam"));

    fireEvent.change(screen.getByLabelText(/evaluationItem.name/i), { target: { value: "Test Item" } });
    fireEvent.change(screen.getByLabelText(/evaluationItem.weight/i), { target: { value: 100 } });

    const submitButton = screen.getByRole("button", { name: /evaluationItem.saveChanges/i });
    await act(async () => fireEvent.click(submitButton));

    await waitFor(() => {
      expect(screen.getByText(/error.serverError/i)).toBeInTheDocument();
    });
  });
});
