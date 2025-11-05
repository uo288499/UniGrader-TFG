import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import Profile from "../pages/users/Profile";
import { SessionContext } from "../SessionContext";
import { MemoryRouter, Route, Routes } from "react-router";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

const mockAxios = new MockAdapter(axios);

const renderWithContext = (ui, sessionValue = { accountID: "1", toggleUserImageUpdated: jest.fn() }) =>
  render(
    <SessionContext.Provider value={sessionValue}>
      <MemoryRouter initialEntries={["/users/1"]}>
        <Routes>
          <Route path="/users/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>
  );

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { resolvedLanguage: "en", changeLanguage: jest.fn() } }),
}));

describe("Profile Page", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  it("renders loading state initially", async () => {
    mockAxios.onGet(/.*/).reply(() => new Promise(() => {}));
    renderWithContext(<Profile />);
    expect(screen.getByTestId("profile-page")).toBeInTheDocument();
  });

  it("renders user and account data", async () => {
    mockAxios.onGet(/.*/).reply(200, {
      account: {
        userId: { identityNumber: "123", name: "John", firstSurname: "Doe", secondSurname: "Smith", photoUrl: "" },
        email: "john@example.com",
        role: "professor",
        university: { university: { name: "TestUni", smallLogoUrl: "" } },
      },
    });

    renderWithContext(<Profile />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("123")).toBeInTheDocument();
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("user.roles.professor")).toBeInTheDocument();
      expect(screen.getByText("TestUni")).toBeInTheDocument();
    });
  });

  it("validates password mismatch on submit", async () => {
    mockAxios.onGet(/.*/).reply(200, {
      account: {
        userId: { identityNumber: "123", name: "John", firstSurname: "Doe", secondSurname: "", photoUrl: "" },
        email: "",
        role: "",
        university: {},
      },
    });

    renderWithContext(<Profile />);
    await waitFor(() => screen.getByText("profile.title"));

    fireEvent.change(screen.getByLabelText("profile.currentPassword"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("profile.newPassword"), { target: { value: "Valid123!" } });
    fireEvent.change(screen.getByLabelText("profile.confirmPassword"), { target: { value: "Mismatch123!" } });

    fireEvent.click(screen.getByText("profile.saveChanges"));

    await waitFor(() => {
      expect(screen.getByText("resetPassword.passwordMismatch")).toBeInTheDocument();
    });
  });

  it("submits successfully when passwords match", async () => {
    mockAxios.onGet(/.*/).reply(200, {
      account: {
        userId: { identityNumber: "123", name: "John", firstSurname: "Doe", secondSurname: "", photoUrl: "" },
        email: "",
        role: "",
        university: {},
      },
    });

    mockAxios.onPut(/.*/).reply(200, { success: true });

    renderWithContext(<Profile />);
    await waitFor(() => screen.getByText("profile.title"));

    fireEvent.change(screen.getByLabelText("profile.currentPassword"), { target: { value: "Current123!" } });
    fireEvent.change(screen.getByLabelText("profile.newPassword"), { target: { value: "Valid123!" } });
    fireEvent.change(screen.getByLabelText("profile.confirmPassword"), { target: { value: "Valid123!" } });

    fireEvent.click(screen.getByText("profile.saveChanges"));

    await waitFor(() => {
      expect(screen.getByText("profile.updated")).toBeInTheDocument();
    });
  });
});
