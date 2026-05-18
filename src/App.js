import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './context/LocaleContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import TitleDetail from './pages/TitleDetail';
import CollectionDetail from './pages/CollectionDetail';
import PersonDetail from './pages/PersonDetail';
import './App.css';

function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/title/:id" element={<TitleDetail />} />
              <Route path="/collection/:id" element={<CollectionDetail />} />
              <Route path="/person/:id" element={<PersonDetail />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ThemeProvider>
    </LocaleProvider>
  );
}

export default App;
