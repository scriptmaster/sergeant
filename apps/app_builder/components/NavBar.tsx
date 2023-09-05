import { Link, React } from "../../deps.react.ts";

export function NavBar() {
  return (
    <header>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/getting-started">Getting Started</Link>
        <Link to="/users/lambtron">Dynamic Routes</Link>
      </nav>
    </header>
  );
}
