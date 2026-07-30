import React from 'react';

const SettingsPage = () => {
  return (
    <div className="flex flex-col h-full bg-dark">
      <div className="h-16 border-b border-border flex items-center px-6 bg-card shrink-0">
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
        <div className="text-center text-muted">
          <p className="text-4xl mb-4">⚙️</p>
          <p className="text-lg">Settings page is under construction.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
