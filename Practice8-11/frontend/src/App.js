import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ShopPage from "./pages/ShopPage/ShopPage";
import AdminPage from "./pages/AdminPage/AdminPage";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;