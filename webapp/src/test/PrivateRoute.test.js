import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SessionContext } from "../SessionContext";

jest.mock("react-router", () => {
  const original = jest.requireActual("react-router");
  return {
    ...original,
    Navigate: ({ to }) => <div data-testid="navigate">Redirected to {to}</div>,
  };
});

import PrivateRoute from "../components/PrivateRoute";

const MockComponent = () => <div>Private Page</div>;

describe("PrivateRoute Component", () => {
  const renderRoute = (contextValue, roles = []) => {
    render(
      <MemoryRouter>
        <SessionContext.Provider value={contextValue}>
          <PrivateRoute element={<MockComponent />} roles={roles} />
        </SessionContext.Provider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders element when session exists and no roles required", () => {
    renderRoute({ isLoggedIn: true, role: "student" });
    expect(screen.getByText("Private Page")).toBeInTheDocument();
  });

  test("redirects to login when not logged in", () => {
    const mockDestroy = jest.fn();
    renderRoute({ isLoggedIn: false, role: "", destroySession: mockDestroy });
    expect(mockDestroy).toHaveBeenCalled();
    expect(screen.getByTestId("navigate")).toHaveTextContent("Redirected to /login");
  });

  test("renders element when role is authorized", () => {
    renderRoute({ isLoggedIn: true, role: "admin" }, ["admin", "professor"]);
    expect(screen.getByText("Private Page")).toBeInTheDocument();
  });

  test("redirects to not-found when role is not authorized", () => {
    renderRoute({ isLoggedIn: true, role: "student" }, ["admin"]);
    expect(screen.getByTestId("navigate")).toHaveTextContent("Redirected to /not-found");
  });
});
