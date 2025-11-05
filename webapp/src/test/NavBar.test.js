import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NavBar from "../components/NavBar";
import { BrowserRouter } from "react-router";
import { SessionContext } from "../SessionContext";
import React from "react";
import axios from "axios";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

const mockChangeLanguage = jest.fn();
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      resolvedLanguage: "en",
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

jest.mock("axios");

describe("NavBar Component", () => {
  const mockDestroySession = jest.fn();
  const mockSetThemeMode = jest.fn();
  const mockSetLargeText = jest.fn();

  const renderNavBar = (contextValue = {}, props = {}) => {
    render(
      <BrowserRouter>
        <SessionContext.Provider value={contextValue}>
          <NavBar
            themeMode={props.themeMode || "normal"}
            setThemeMode={props.setThemeMode || mockSetThemeMode}
            isLargeTextMode={props.isLargeTextMode || false}
            setIsLargeTextMode={props.setIsLargeTextMode || mockSetLargeText}
          />
        </SessionContext.Provider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders navbar with basic controls", () => {
    renderNavBar({ isLoggedIn: false, role: "" });

    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByLabelText("aria.openDrawer")).toBeInTheDocument();
    expect(screen.getByLabelText("home")).toBeInTheDocument();
  });

  test("renders role chip and logout button when logged in", async () => {
    axios.get.mockResolvedValueOnce({
      data: { account: { userId: { name: "Alice", firstSurname: "Doe", photoUrl: "" } } },
    });

    renderNavBar({
      isLoggedIn: true,
      role: "student",
      accountID: "acc123",
      destroySession: mockDestroySession,
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(screen.getByText("user.roles.student")).toBeInTheDocument();
    expect(screen.getByText("logout")).toBeInTheDocument();

    fireEvent.click(screen.getByText("logout"));
    expect(mockDestroySession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("opens and closes the drawer menu", async () => {
    renderNavBar({
      isLoggedIn: true,
      role: "admin",
      universityID: "u123",
      accountID: "a123",
    });

    fireEvent.click(screen.getByLabelText("aria.openDrawer"));
    await waitFor(() => screen.getByText("navigation"));
    expect(screen.getByText("navigation")).toBeInTheDocument();

    expect(screen.getByText("subjects")).toBeInTheDocument();
    expect(screen.getByText("studyProgramsNav")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("aria.closeDrawer"));
    await waitFor(() => expect(screen.queryByText("navigation")).not.toBeInTheDocument());
  });

  test("navigates to home when clicking the home icon", () => {
    renderNavBar({ isLoggedIn: true, role: "student" });
    fireEvent.click(screen.getByLabelText("home"));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("language menu opens and changes language", () => {
    renderNavBar({ isLoggedIn: false, role: "" });
    fireEvent.click(screen.getByLabelText("aria.selectLanguage") || screen.getByRole("button", { name: /EN/i }));
    const esOption = screen.getByText("ES");
    fireEvent.click(esOption);

    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
  });

  test("toggles accessibility options", async () => {
    renderNavBar(
      { isLoggedIn: true, role: "professor", universityID: "u1" },
      { setThemeMode: mockSetThemeMode, setIsLargeTextMode: mockSetLargeText }
    );

    fireEvent.click(screen.getByLabelText("aria.accessibilityOptions"));
    expect(await screen.findByText("themes.grayscale")).toBeInTheDocument();

    fireEvent.click(screen.getByText("themes.largeText"));
    expect(mockSetLargeText).toHaveBeenCalled();
  });

  test("navigates to profile when clicking avatar", async () => {
    axios.get.mockResolvedValueOnce({
      data: { account: { userId: { name: "Bob", firstSurname: "Smith", photoUrl: "" } } },
    });

    renderNavBar({
      isLoggedIn: true,
      role: "student",
      accountID: "acc999",
      destroySession: mockDestroySession,
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    const avatarBtn = screen.getByLabelText("aria.profile");
    fireEvent.click(avatarBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/profile/acc999");
  });
});
