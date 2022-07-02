import { BrowserRouter, Route, Routes } from "react-router-dom";
import A from "./pages/A";
import B from "./pages/B";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/a" element={<A />} />
          <Route path="/b" element={<B />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
