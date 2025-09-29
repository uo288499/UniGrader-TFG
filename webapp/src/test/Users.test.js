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
  {
    _id: "u2",
    email: "user2@test.com",
    role: "professor",
    universityId: "uni2",
    userId: {
      _id: "uid2",
      name: "Alice",
      firstSurname: "Wonder",
      secondSurname: "",
      identityNumber: "87654321B",
      photoUrl: "alice.jpg",
    },
    university: { university: { name: "Uni Two" } },
  },
];

const mockUniversities = [
  { _id: "uni1", name: "Uni One" },
  { _id: "uni2", name: "Uni Two" },
];

describe("Users Page - Full Coverage", () => {
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
      expect(screen.getByText("Alice Wonder")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(500);
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(500);

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByText("noResults")).toBeInTheDocument();
    });
  });

  it("filters users correctly", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: mockUsers });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    renderWithContext();

    await waitFor(() => expect(screen.getByText("John Doe Smith")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/user.fullName/i), { target: { value: "Alice" } });
    expect(screen.getByText("Alice Wonder")).toBeInTheDocument();
    expect(screen.queryByText("John Doe Smith")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/user.identityNumber/i), { target: { value: "1234" } });
    expect(screen.getByText("noResults")).toBeInTheDocument();

    // Reset filters
    fireEvent.click(screen.getByRole("button", { name: /resetFilters/i }));
    expect(screen.getByText("John Doe Smith")).toBeInTheDocument();
    expect(screen.getByText("Alice Wonder")).toBeInTheDocument();
  });

  it("navigates to create user page when allowed", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });

    renderWithContext("global-admin");

    await waitFor(() => {
      const createButton = screen.getByRole("button", { name: /user.new/i });
      fireEvent.click(createButton);
      expect(mockNavigate).toHaveBeenCalledWith("/users/new");
    });
  });

  it("does not show create button for student or professor", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: [] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: [] });

    renderWithContext("student");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /user.new/i })).not.toBeInTheDocument();
    });
  });

  it("navigates to edit user on edit icon click", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: mockUsers });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    renderWithContext();

    const editButton = await screen.findByTestId("edit-button-u1");
    fireEvent.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith("/users/u1");
  });

  it("handles pagination", async () => {
    const manyUsers = Array.from({ length: 12 }, (_, i) => ({
      _id: `user${i}`,
      email: `user${i}@test.com`,
      role: "student",
      universityId: "uni1",
      userId: {
        _id: `uid${i}`,
        name: `Name${i}`,
        firstSurname: `Surname${i}`,
        secondSurname: "",
        identityNumber: `DNI${i}`,
        photoUrl: "",
      },
      university: { university: { name: "Uni One" } },
    }));

    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: manyUsers });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    renderWithContext();

    await waitFor(() => expect(screen.getByText("Name0 Surname0")).toBeInTheDocument());

    const nextPageButton = screen.getByLabelText("Go to next page");
    fireEvent.click(nextPageButton);
    
    await waitFor(() => expect(screen.getByText("Name5 Surname5")).toBeInTheDocument());
  });

  it("renders avatar fallback initials when photoUrl is empty", async () => {
    mockAxios.onGet(`${GATEWAY_URL}/auth/accounts`).reply(200, { accounts: [mockUsers[0]] });
    mockAxios.onGet(`${GATEWAY_URL}/academic/universities`).reply(200, { universities: mockUniversities });

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });
});
