import { Navigate, React, Route, Routes } from "../deps.react.ts";
import { NavBar } from "./components/NavBar.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { GettingStartedPage } from "./pages/GettingStartedPage.tsx";
import { UserPage } from "./pages/UserPage.tsx";
import { Footer } from "./components/Footer.tsx";

export default function App() {
  return (
    <>
      <NavBar />
      <section className="content">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/getting-started" element={<GettingStartedPage />} />
        <Route path="/users/:username" element={<UserPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </section>
      <Footer />
    </>
  );
}
