import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

function App() {
  const [datetime, setDatetime] = useState({ date: '', time: '' });

  useEffect(() => {
    axios.get(`${GATEWAY_URL}/datetime`)
      .then((response) => setDatetime(response.data))
      .catch((error) => console.error('Error fetching datetime:', error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Current Date and Time</h1>
        {datetime.date && datetime.time ? (
          <p>
            Date: {datetime.date} <br />
            Time: {datetime.time}
          </p>
        ) : (
          <p>Loading...</p>
        )}
      </header>
    </div>
  );
}

export default App;
