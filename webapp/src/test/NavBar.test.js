import { render, screen, fireEvent } from "@testing-library/react";
import NavBar from "../components/NavBar";
import { BrowserRouter } from "react-router";
import { SessionContext } from "../SessionContext";
import React from "react";

// Mock navigate
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

describe("NavBar Component", () => {
  const renderNavBar = (contextValue, props = {}) => {
    render(
      <BrowserRouter>
        <SessionContext.Provider value={contextValue}>
          <NavBar
            themeMode={props.themeMode || "normal"}
            setThemeMode={props.setThemeMode || jest.fn()}
            isLargeTextMode={props.isLargeTextMode || false}
            setIsLargeTextMode={props.setIsLargeTextMode || jest.fn()}
          />
        </SessionContext.Provider>
      </BrowserRouter>
    );
  };

  test("renders hamburger menu and language button", () => {
    renderNavBar({ isLoggedIn: false, role: "" });

    expect(screen.getByLabelText("aria.openDrawer")).toBeInTheDocument();
    expect(screen.getByLabelText("aria.selectLanguage")).toBeInTheDocument();
  });

  test("opens drawer menu", async () => {
    renderNavBar({ isLoggedIn: true, role: "admin", universityID: "123" });

    const openBtn = screen.getByLabelText("aria.openDrawer");
    fireEvent.click(openBtn);

    expect(await screen.findByText("navigation")).toBeInTheDocument();
  });

  test("renders logout button when logged in", () => {
    const mockDestroySession = jest.fn();
    renderNavBar({
      isLoggedIn: true,
      role: "student",
      destroySession: mockDestroySession,
      universityID: "123",
    });

    const logoutBtn = screen.getByText("logout");
    expect(logoutBtn).toBeInTheDocument();

    fireEvent.click(logoutBtn);
    expect(mockDestroySession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("renders menu items based on role", () => {
    renderNavBar({ isLoggedIn: true, role: "admin", universityID: "uni123" });

    const openBtn = screen.getByLabelText("aria.openDrawer");
    fireEvent.click(openBtn);

    expect(screen.getByText("studyProgramsNav")).toBeInTheDocument();
    expect(screen.getByText("subjects")).toBeInTheDocument();
  });

  test("toggles accessibility options", () => {
    const mockSetThemeMode = jest.fn();
    const mockSetLargeText = jest.fn();

    renderNavBar(
      { isLoggedIn: true, role: "student", universityID: "uni123" },
      { setThemeMode: mockSetThemeMode, setIsLargeTextMode: mockSetLargeText }
    );

    const accessibilityBtn = screen.getByLabelText("aria.accessibilityOptions");
    fireEvent.click(accessibilityBtn);

    expect(screen.getByText("themes.grayscale")).toBeInTheDocument();
    expect(screen.getByText("themes.largeText")).toBeInTheDocument();

    fireEvent.click(screen.getByText("themes.largeText"));
    expect(mockSetLargeText).toHaveBeenCalled();
  });
});
