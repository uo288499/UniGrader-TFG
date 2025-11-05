import { render, screen } from "@testing-library/react";
import App from "../App";
import { MemoryRouter } from "react-router";
import { SessionContext } from "../SessionContext";
import axios from "axios";

jest.mock('axios', () => ({
  get: jest.fn((url) => {
    return Promise.resolve({ data: {} });
  }),
  
  post: jest.fn(() => Promise.resolve({ data: {} })),
  
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  })),
}));

// Reusable render function with mock context
const renderWithProviders = (
  ui,
  { isLoggedIn = false, role = null, initialRoute = "/" } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <SessionContext.Provider
        value={{ isLoggedIn, role, destroySession: jest.fn() }}
      >
        {ui}
      </SessionContext.Provider>
    </MemoryRouter>
  );
};

describe("App Component Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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
    renderWithProviders(<App />, {
      initialRoute: "/",
      isLoggedIn: true,
      role: "global-admin",
    });
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  test("renders universities list page when logged in as global-admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/universities",
      isLoggedIn: true,
      role: "global-admin",
    });
    expect(screen.getByTestId("universities-list-page")).toBeInTheDocument();
  });

  test("renders university form page when logged in as global-admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/universities/new",
      isLoggedIn: true,
      role: "global-admin",
    });
    expect(screen.getByTestId("university-form-page")).toBeInTheDocument();
  });

  test("renders users list page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/users",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("users-list-page")).toBeInTheDocument();
  });

  test("renders user form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/users/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("user-form-page")).toBeInTheDocument();
  });

  test("renders study programs page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/study-programs",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("studyprograms-list-page")).toBeInTheDocument();
  });

  test("renders study program form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/study-programs/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("studyprogram-form-page")).toBeInTheDocument();
  });

  test("renders academic years page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/academic-years",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("academicyears-list-page")).toBeInTheDocument();
  });

  test("renders academic year form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/academic-years/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("academicyear-form-page")).toBeInTheDocument();
  });

  test("renders evaluation types page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/evaluation-types",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("evaluationtypes-list-page")).toBeInTheDocument();
  });

  test("renders evaluation type form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/evaluation-types/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("evaluationtype-form-page")).toBeInTheDocument();
  });

  test("renders subjects page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/subjects",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("subjects-list-page")).toBeInTheDocument();
  });

  test("renders subject form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/subjects/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("subject-form-page")).toBeInTheDocument();
  });

  test("renders courses page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/courses",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("courses-list-page")).toBeInTheDocument();
  });

  test("renders course form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/courses/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("course-form-page")).toBeInTheDocument();
  });

  test("renders enrollments page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/enrollments",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("enrollments-list-page")).toBeInTheDocument();
  });

  test("renders enrollment form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/enrollments/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("enrollment-form-page")).toBeInTheDocument();
  });

  test("renders groups page when logged in as professor", () => {
    renderWithProviders(<App />, {
      initialRoute: "/groups",
      isLoggedIn: true,
      role: "professor",
    });
    expect(screen.getByTestId("groups-list-page")).toBeInTheDocument();
  });

  test("renders group form page when logged in as admin", () => {
    renderWithProviders(<App />, {
      initialRoute: "/groups/new",
      isLoggedIn: true,
      role: "admin",
    });
    expect(screen.getByTestId("group-form-page")).toBeInTheDocument();
  });

  test("renders 404 page on invalid route", () => {
    renderWithProviders(<App />, { initialRoute: "/non-existing-route" });
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
  });

  test("renders NavBar and Footer in all routes", () => {
    renderWithProviders(<App />, {
      initialRoute: "/",
      isLoggedIn: true,
      role: "admin",
    });

    expect(screen.getByTestId("navbar")).toBeInTheDocument(); 
    expect(screen.getByTestId("footer")).toBeInTheDocument(); 
  });
});
