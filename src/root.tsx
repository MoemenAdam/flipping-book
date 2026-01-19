import { Routes, Route } from 'react-router-dom';
import Page from './page.tsx';
import View from './view/page.tsx';

function AllRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Page />} />
      <Route path="/view" element={<View />} />
    </Routes>
  );
}

export default AllRoutes;
