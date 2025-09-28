import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { BrowserRouter } from "react-router";
import Users from "../pages/users/Users";
import { SessionContext } from "../SessionContext";

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

const mockUsers = [
  {
    _id: "u1",
    email: "user1@test.com",
    role: "student",
    universityId: "uni1",
    userId: {
      _id: "uid1",
      name: "John",
      firstSurname: "Doe",
      secondSurname: "Smith",
      identityNumber: "12345678A",
      photoUrl: "",
    },
    university: { university: { name: "Uni One" } },
  },
];

const mockUniversities = [
  { _id: "uni1", name: "Uni One" },
];

describe("Users Page", () => {
  beforeEach(() => {
    mockAxios.reset();
    mockNavigate.mockReset();
  });

  const renderWithContext = (role = "global-admin", universityID = "uni1") =>
    render(
      <SessionContext.Provider value={{ role, universityID }}>
        <BrowserRouter>
          <Users />
        </BrowserRouter>
      </SessionContext.Provider>
    );

  it("renders loading and then users list", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: mockUsers });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    renderWithContext();

    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("John Doe Smith")).toBeInTheDocument();
      expect(screen.getByText("12345678A")).toBeInTheDocument();
    });
  });

  it("navigates to create user page on button click", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });

    renderWithContext();

    await waitFor(() => {
      const createButton = screen.getByRole("button", { name: /user.new/i });
      fireEvent.click(createButton);
      expect(mockNavigate).toHaveBeenCalledWith("/users/new");
    });
  });
});
