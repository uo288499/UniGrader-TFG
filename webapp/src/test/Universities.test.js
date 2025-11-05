import React from "react";
import { render, screen, waitFor, fireEvent, userEvent, within } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import Universities from "../pages/universities/Universities";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { resolvedLanguage: "en", changeLanguage: jest.fn() },
  }),
}));

const mockAxios = new MockAdapter(axios);
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const mockUniversities = [
  {
    _id: "u1",
    name: "Uni One",
    address: "Address 1",
    contactEmail: "contact1@uni.com",
    contactPhone: "123456789",
  },
  {
    _id: "u2",
    name: "Uni Two",
    address: "Address 2",
    contactEmail: "contact2@uni.com",
    contactPhone: "987654321",
  },
];

describe("Universities Page - Full Coverage", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  const setup = () =>
    render(
      <BrowserRouter>
        <Universities />
      </BrowserRouter>
    );

  it("renders loading and then universities list", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    setup();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Uni One")).toBeInTheDocument();
      expect(screen.getByText("Uni Two")).toBeInTheDocument();
    });
  });

  it("navigates to create new university when clicking button", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });

    setup();

    await waitFor(() => {
      const createButton = screen.getByRole("button", { name: /new/i });
      fireEvent.click(createButton);
      expect(mockNavigate).toHaveBeenCalledWith("/universities/new");
    });
  });

  it("navigates to edit university when clicking edit icon", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    setup();

    const editButton = await screen.findByTestId("edit-button-u1");
    fireEvent.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith("/universities/u1");
  });

  it("shows no results message if filter matches nothing", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    setup();

    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "NonExisting" } });
      expect(screen.getByText(/noResults/i)).toBeInTheDocument();
    });
  });

  it("applies all filters and resets correctly", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    setup();

    await waitFor(() => screen.getByText("Uni One"));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Uni One" } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Address 1" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "contact1" } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "123456789" } });

    await waitFor(() => {
      expect(screen.getByText("Uni One")).toBeInTheDocument();
      expect(screen.queryByText("Uni Two")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /resetFilters/i }));

    await waitFor(() => {
      expect(screen.getByText("Uni One")).toBeInTheDocument();
      expect(screen.getByText("Uni Two")).toBeInTheDocument();
    });
  });

  it("renders university with icon when no smallLogoUrl", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [{ _id: "u3", name: "Uni Three" }] });

    setup();

    await waitFor(() => screen.getByText("Uni Three"));
    expect(screen.getByText("Uni Three")).toBeInTheDocument();
  });

  it("handles pagination correctly", async () => {
    const bigList = Array.from({ length: 12 }, (_, i) => ({ _id: `u${i}`, name: `Uni ${i}` }));
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: bigList });

    setup();

    await waitFor(() => screen.getByText("Uni 0"));

    const nextPageButton = screen.getByLabelText("Go to next page");
    fireEvent.click(nextPageButton);

    await waitFor(() => expect(screen.getByText("Uni 5")).toBeInTheDocument());
  });

  it("filters multiple fields at the same time", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    setup();

    await waitFor(() => screen.getByText("Uni One"));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Uni" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "contact2" } });

    await waitFor(() => {
      expect(screen.queryByText("Uni One")).not.toBeInTheDocument();
      expect(screen.getByText("Uni Two")).toBeInTheDocument();
    });
  });

  it("shows empty list when API fails", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(500);

    setup();

    await waitFor(() => {
      expect(screen.queryByText("Uni One")).not.toBeInTheDocument();
      expect(screen.queryByText("Uni Two")).not.toBeInTheDocument();
    });
  });

  test("handles pagination change", async () => {
    const bigList = Array.from({ length: 12 }, (_, i) => ({
      _id: `u${i}`,
      name: `Uni ${i}`,
      address: `Address ${i}`,
      contactEmail: `contact${i}@uni.com`,
      contactPhone: `100${i}`,
    }));
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: bigList });

    setup();

    await waitFor(() => expect(screen.getByText("Uni 0")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Go to next page"));
    await waitFor(() => expect(screen.getByText("Uni 5")).toBeInTheDocument());
  });

  it("changes rows per page and resets page", async () => {
    const manyUniversities = Array.from({ length: 12 }, (_, i) => ({
      _id: `u${i}`,
      name: `Uni ${i}`,
      address: `Address ${i}`,
      contactEmail: `contact${i}@uni.com`,
      contactPhone: `100${i}`,
    }));

    mockAxios
      .onGet(`${GATEWAY_URL}/academic/universities`)
      .reply(200, { universities: manyUniversities });

    setup();

    await waitFor(() => expect(screen.getByText("Uni 0")).toBeInTheDocument());
    expect(screen.queryByText("Uni 7")).not.toBeInTheDocument();

    const pagination = screen.getByTestId("rows-per-page");
    const selectTrigger = screen.getByRole("combobox");

    fireEvent.mouseDown(selectTrigger);
    const option = await screen.findByRole("option", { name: "10" });
    fireEvent.click(option);

    expect(selectTrigger).toHaveTextContent("10");

    await waitFor(() => expect(screen.getByText("Uni 7")).toBeInTheDocument());
  });
});
