import { useContext, useEffect, useState } from "react";
import { Box, Link, Typography, Tooltip } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import axios from "axios";
import { SessionContext } from "../SessionContext";
import { useTranslation } from "react-i18next";


const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Footer = ({ themeMode }) => {
  const { universityID, universityImageUpdated } = useContext(SessionContext);
  const [largeLogoUrl, setLargeLogoUrl] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUniversityLogo = async () => {
      try {
        if (!universityID) {
          setLargeLogoUrl(null);
          return;
        }

        if (universityID) {
          const { data } = await axios.get(`${GATEWAY_URL}/academic/universities/${universityID}`);
          if (data?.success && data.university?.largeLogoUrl) {
            setLargeLogoUrl(data.university.largeLogoUrl);
          } else {
            setLargeLogoUrl(null);
          }
        }
      } catch (err) {
        console.error("Error fetching university logo:", err);
      }
    };
    fetchUniversityLogo();
  }, [universityID, universityImageUpdated]);

  const uniGraderLogo =
    themeMode === "grayscale"
      ? "/images/UniGrader_gray.svg"
      : "/images/UniGrader.svg";

  return (
    <Box
      component="footer"
      data-testid="footer"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        display: "flex",
        px: 4,
        py: 1.5,
        backgroundColor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        zIndex: 1200,
      }}
    >
      {/* Left: University Logo */}
      <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
        {largeLogoUrl ? (
          <Box
            component="img"
            src={largeLogoUrl}
            alt="University logo"
            sx={{ height: 56, objectFit: "contain" }}
          />
        ) : (
          <Box sx={{ height: 56 }} />
        )}
      </Box>

      {/* Center: GitHub Link */}
      <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <Tooltip title="View project on GitHub" arrow>
          <Link
            data-testid="github-link"
            href="https://github.com/uo288499/UniGrader-TFG"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="text.secondary"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontWeight: 500,
              transition: "color 0.2s",
              "&:hover": { color: "text.primary" },
            }}
          >
            <GitHubIcon fontSize="small" />
            <Typography variant="body1">{t("sourceCode")}</Typography>
          </Link>
        </Tooltip>
      </Box>

      {/* Right: UniGrader Logo */}
      <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <Box
          component="img"
          src={uniGraderLogo}
          alt="UniGrader logo"
          sx={{ height: 50, objectFit: "contain" }}
        />
      </Box>
    </Box>
  );
};

export default Footer;
