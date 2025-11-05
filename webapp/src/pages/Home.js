import { useContext, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import axios from "axios";
import { SessionContext } from "../SessionContext";
import { useTranslation } from "react-i18next";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8000";

const Home = ({ themeMode }) => {
  const { t } = useTranslation();
  const { universityID, role, accountID } = useContext(SessionContext);

  const [uniLogo, setUniLogo] = useState(null);
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    const fetchUniversityLogo = async () => {
      try {
        if (!universityID) return;

        const { data } = await axios.get(
          `${GATEWAY_URL}/academic/universities/${universityID}`
        );

        if (data?.success && data.university?.largeLogoUrl) {
          setUniLogo(data.university.largeLogoUrl);
        }
      } catch (err) {
        console.error("Error fetching university logo:", err);
      }
    };
    fetchUniversityLogo();
  }, [universityID]);

  useEffect(() => {
    const fetchAccountName = async () => {
      try {
        if (!accountID) return;

        const { data } = await axios.get(
          `${GATEWAY_URL}/authVerify/accounts/${accountID}`
        );

        if (data?.success && data.account) {
          const a = data.account;
          setAccountName(`${a.userId.name} ${a.userId.firstSurname} ${a.userId.secondSurname || ""}`);
        }
      } catch (err) {
        console.error("Error fetching account name:", err);
      }
    };
    fetchAccountName();
  }, [accountID]);

  // Logo de UniGrader
  const uniGraderLogo =
    themeMode === "grayscale" ? "/images/UniGrader_Gray.svg" : "/images/UniGrader.svg";

  return (
    <Box data-testid="home-page"
      sx={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 2,
      }}
    >
      {/* UniGrader logo */}
      <Box
        component="img"
        src={uniGraderLogo}
        alt="UniGrader Logo"
        sx={{ height: 120, objectFit: "contain", mb: 4 }}
      />

      {/* University logo */}
      {uniLogo && (
        <Box
          component="img"
          src={uniLogo}
          alt="University Logo"
          sx={{ height: 80, objectFit: "contain", mb: 4 }}
        />
      )}

      {/* Welcome message */}
      <Typography variant="h4" fontWeight="bold" mb={2}>
        {t("welcome", { name: accountName })}
      </Typography>

      {/* Role-specific info */}
      <Typography variant="body1" color="text.secondary" maxWidth={600}>
        {t(`homePage.${role}`)}
      </Typography>
    </Box>
  );
};

export default Home;
