import { render, screen } from "@testing-library/react";
import App from "../App";
import { MemoryRouter } from "react-router";
import { SessionContext } from "../SessionContext";

// Wrapper con contexto simulado
const renderWithProviders = (
  ui,
  { isLoggedIn = false, role = null, initialRoute = "/" } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <SessionContext.Provider value={{ isLoggedIn, role }}>
        {ui}
      </SessionContext.Provider>
    </MemoryRouter>
  );
};

describe("App Component Routes", () => {
  test("renders login page", () => {
    renderWithProviders(<App />, { initialRoute: "/login" });
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  test("renders forgot password page", () => {
    renderWithProviders(<App />, { initialRoute: "/forgot-password" });
    expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
  });

  test("renders reset password page", () => {
    renderWithProviders(<App />, { initialRoute: "/reset-password/12345" });
    expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
  });

  test("renders home page when logged in", () => {
    renderWithProviders(<App />, { initialRoute: "/", isLoggedIn: true, role: "global-admin" });
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  test("renders universities list page when logged in as global-admin", () => {
    renderWithProviders(<App />, { initialRoute: "/universities", isLoggedIn: true, role: "global-admin" });
    expect(screen.getByTestId("universities-list-page")).toBeInTheDocument();
  });

  test("renders 404 page on invalid route", () => {
    renderWithProviders(<App />, { initialRoute: "/non-existing-route" });
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
  });
});