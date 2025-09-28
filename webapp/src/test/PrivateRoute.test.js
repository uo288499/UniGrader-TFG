import { render, screen } from "@testing-library/react";
import PrivateRoute from "../components/PrivateRoute";
import { BrowserRouter } from "react-router";
import React from "react";
import { SessionContext } from "../SessionContext";

const MockComponent = () => <div>Private Page</div>; // Mock element

describe("PrivateRoute Component", () => {
  const renderRoute = (contextValue, roles = []) => {
    render(
      <BrowserRouter>
        <SessionContext.Provider value={contextValue}>
          <PrivateRoute element={<MockComponent />} roles={roles} />
        </SessionContext.Provider>
      </BrowserRouter>
    );
  };

  test("renders element when session exists and no roles required", () => {
    renderRoute({ isLoggedIn: true, role: "student" });
    expect(screen.getByText("Private Page")).toBeInTheDocument();
  });

  test("redirects to login when not logged in", () => {
    renderRoute({ isLoggedIn: false, role: "" });
    expect(window.location.pathname).toBe("/login");
  });

  test("renders element when role is authorized", () => {
    renderRoute({ isLoggedIn: true, role: "admin" }, ["admin", "professor"]);
    expect(screen.getByText("Private Page")).toBeInTheDocument();
  });

  test("redirects to not-found when role is not authorized", () => {
    renderRoute({ isLoggedIn: true, role: "student" }, ["admin"]);
    expect(window.location.pathname).toBe("/not-found");
  });
});
