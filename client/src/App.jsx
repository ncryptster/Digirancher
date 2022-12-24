import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import LoginButton from './components/LoginButton/LoginButton';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
          </ul>
        </nav>
        <Route path="/" exact component={LoginButton} />
        <Route path="/dashboard" component={Dashboard} />
      </div>
    </Router>
  );
}

export default App;

