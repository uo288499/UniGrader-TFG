import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import NotFound from "../pages/NotFound";

const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
}));

describe("NotFound Page", () => {
  const setup = () =>
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );

  it("renders the 404 title and texts", () => {
    setup();

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/notFound.title/i)).toBeInTheDocument();
    expect(screen.getByText(/notFound.message/i)).toBeInTheDocument();
  });

  it("renders the Go Home button", () => {
    setup();

    const button = screen.getByRole("button", { name: /notFound.goHome/i });
    expect(button).toBeInTheDocument();
  });

  it("navigates to home when clicking Go Home", () => {
    setup();

    const button = screen.getByRole("button", { name: /notFound.goHome/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
