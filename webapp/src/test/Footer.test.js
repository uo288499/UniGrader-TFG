import { render, screen, waitFor } from "@testing-library/react";
import Footer from "../components/Footer";
import axios from "axios";
import { SessionContext } from "../SessionContext";

jest.mock("axios");

const mockT = (key) => key;

const renderFooter = (contextValue, themeMode = "normal") => {
  return render(
    <SessionContext.Provider value={contextValue}>
      <Footer themeMode={themeMode} />
    </SessionContext.Provider>
  );
};

describe("Footer Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders footer container", () => {
    renderFooter({ universityID: null, universityImageUpdated: false });
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  test("renders UniGrader logo based on themeMode", () => {
    const { rerender } = renderFooter({ universityID: null, universityImageUpdated: false }, "light");
    const logoLight = screen.getByAltText("UniGrader logo");
    expect(logoLight).toHaveAttribute("src", "/images/UniGrader.svg");

    rerender(
      <SessionContext.Provider value={{ universityID: null, universityImageUpdated: false }}>
        <Footer themeMode="grayscale" />
      </SessionContext.Provider>
    );
    const logoGray = screen.getByAltText("UniGrader logo");
    expect(logoGray).toHaveAttribute("src", "/images/UniGrader_gray.svg");
  });

  test("renders GitHub link with correct href", () => {
    renderFooter({ universityID: null, universityImageUpdated: false });
    const githubLink = screen.getByTestId("github-link");
    expect(githubLink).toHaveAttribute("href", "https://github.com/uo288499/UniGrader-TFG");
  });

  test("renders university logo when API returns a valid URL", async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, university: { largeLogoUrl: "https://example.com/logo.png" } },
    });

    renderFooter({ universityID: "1", universityImageUpdated: false });

    await waitFor(() => {
      const uniLogo = screen.getByAltText("University logo");
      expect(uniLogo).toHaveAttribute("src", "https://example.com/logo.png");
    });
  });

  test("does not render university logo if no universityID", async () => {
    axios.get.mockClear();
    renderFooter({ universityID: null, universityImageUpdated: false });
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("handles API error gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network error"));
    renderFooter({ universityID: "99", universityImageUpdated: false });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });
  });
});
