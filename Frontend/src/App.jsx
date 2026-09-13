import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AdminView } from './views/AdminView';
import { PosView } from './views/PosView';

export function App() {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">
        {activeTab === 'admin' ? (
          <AdminView />
        ) : (
          <PosView />
        )}
      </main>
    </div>
  );
}

export default App;
