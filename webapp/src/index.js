import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router';
import { SessionProvider } from './SessionContext';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { common, grey, red, green, orange } from '@mui/material/colors';

const Root = () => {

  const [themeMode, setThemeMode] = useState(() => {
    const storedTheme = localStorage.getItem('themeMode');
    return storedTheme || 'normal';
  });

  const [isLargeTextMode, setIsLargeTextMode] = useState(() => {
    const storedTextMode = localStorage.getItem('isLargeTextMode');
    return storedTextMode === 'true'; 
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('isLargeTextMode', isLargeTextMode);
  }, [isLargeTextMode]);

  const theme = createTheme({
    palette: {
      mode: 'light',
      ...(themeMode === 'normal' && {
        primary: {
          main: '#1976d2',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#4caf50',
          contrastText: '#ffffff',
        },
        error: {
          main: red[500],
          contrastText: '#ffffff',
        },
        success: {
          main: green[500],
          contrastText: '#ffffff',
        },
        warning: {
          main: orange[500],
          contrastText: '#ffffff',
        },
        background: {
          default: '#f4f4f5',
          paper: '#ffffff',
        },
        text: {
          primary: '#171717',
          secondary: grey[700],
        },
        divider: '#505050ff',
      }),
      ...(themeMode === 'grayscale' && {
        primary: {
          main: grey[800],
          contrastText: common.white,
        },
        secondary: {
          main: grey[500],
          contrastText: common.white,
        },
        error: {
          main: grey[600],
          contrastText: common.white,
        },
        success: {
          main: grey[500],
          contrastText: common.white,
        },
        warning: {
          main: grey[400], 
          contrastText: common.black,
        },
        background: {
          default: grey[100],
          paper: common.white,
        },
        text: {
          primary: common.black,
          secondary: grey[800],
        },
        divider: grey[400],
      }),
    },
    typography: {
      fontSize: 16,
      h1: { fontSize: isLargeTextMode ? '2.5rem' : '1.75rem' },
      h2: { fontSize: isLargeTextMode ? '2rem' : '1.5rem' },
      h3: { fontSize: isLargeTextMode ? '1.75rem' : '1.3rem' },
      h4: { fontSize: isLargeTextMode ? '1.5rem' : '1.1rem' },
      h5: { fontSize: isLargeTextMode ? '1.25rem' : '1rem' },
      h6: { fontSize: isLargeTextMode ? '1.1rem' : '0.9rem' },
      body1: { fontSize: isLargeTextMode ? '20px' : '1rem' },
      button: { fontSize: isLargeTextMode ? '20px' : '1rem' },
      menuItem: { fontSize: isLargeTextMode ? '20px' : '1rem' },
    },
    components: {
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            fontSize: isLargeTextMode ? '2rem' : '1.5rem',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: isLargeTextMode ? '64px' : '56px',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            fontSize: isLargeTextMode ? '20px' : '1rem',
            backgroundColor: themeMode === 'grayscale' ? grey[300] : undefined,
            color: themeMode === 'grayscale' ? grey[900] : undefined,
          },
          icon: {
            ...(themeMode === 'grayscale' && {
              color: grey[800] + ' !important',
            }),
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: isLargeTextMode ? '20px' : '1rem', 
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          toolbar: {
            display: "flex",
            alignItems: "center", 
          },
          select: {
            fontSize: isLargeTextMode ? "20px" : "1rem",
            display: "flex",
            alignItems: "center",  
          },
          selectIcon: {
            fontSize: isLargeTextMode ? "20px" : "1rem",
            top: "unset", 
          },
          displayedRows: {
            fontSize: isLargeTextMode ? "20px" : "1rem",
            display: "flex",
            alignItems: "center",
          },
          selectLabel: {
            fontSize: isLargeTextMode ? '20px' : '1rem',
          },
          actions: {
            fontSize: isLargeTextMode ? '20px' : '1rem',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            minHeight: isLargeTextMode ? '48px' : '40px',
            display: 'flex',
            alignItems: 'center',
          },
          icon: {
            fontSize: isLargeTextMode ? '20px' : '1rem', 
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontSize: isLargeTextMode ? '1rem' : '0.8rem',
          },
        },
      },
    },
  });

  return (
    <React.StrictMode>
      <BrowserRouter>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <App
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              isLargeTextMode={isLargeTextMode}
              setIsLargeTextMode={setIsLargeTextMode}
            />
          </ThemeProvider>
        </SessionProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);

reportWebVitals();
