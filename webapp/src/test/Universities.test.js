import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import Universities from "../pages/universities/Universities";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

// Mock i18n
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      resolvedLanguage: "en",
      changeLanguage: jest.fn(),
    },
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

describe("Universities Page", () => {
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
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, {
      universities: mockUniversities,
    });

    setup();

    // Loader
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Esperar a que se renderice la tabla
    await waitFor(() => {
      expect(screen.getByText("Uni One")).toBeInTheDocument();
      expect(screen.getByText("Uni Two")).toBeInTheDocument();
    });
  });

  it("navigates to create new university when clicking button", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, {
      universities: [],
    });

    setup();

    await waitFor(() => {
      const createButton = screen.getByRole("button", { name: /new/i });
      fireEvent.click(createButton);
      expect(mockNavigate).toHaveBeenCalledWith("/universities/new");
    });
  });

  it("navigates to edit university when clicking edit icon", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, {
      universities: mockUniversities,
    });

    setup();

    const editButton = await screen.findByTestId("edit-button-u1");
    fireEvent.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith("/universities/u1");
  });

  it("shows no results message if filter matches nothing", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, {
      universities: mockUniversities,
    });

    setup();

    await waitFor(() => {
      const nameFilter = screen.getByLabelText(/name/i);
      fireEvent.change(nameFilter, { target: { value: "NonExisting" } });
      expect(screen.getByText(/noResults/i)).toBeInTheDocument();
    });
  });

  it("shows error and empty list when API fails", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(500);

    setup();

    await waitFor(() => {
      expect(screen.queryByText("Uni One")).not.toBeInTheDocument();
      expect(screen.queryByText("Uni Two")).not.toBeInTheDocument();
    });
  });
});
