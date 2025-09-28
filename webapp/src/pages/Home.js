import logo from '../logo.svg';
import '../App.css';

function Home() {
  return (
        <div data-testid="home-page">
          <header>
            <img src={logo} className="App-logo" alt="logo" />
            <p>Test</p>
          </header>
        </div>
  );
}

export default Home;