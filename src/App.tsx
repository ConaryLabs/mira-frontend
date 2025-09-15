import React from 'react';
import { ChatContainer } from './components/ChatContainer';

function App() {
  console.log('App mounting...');
  
  return (
    <div className="h-screen w-screen overflow-hidden">
      <ChatContainer />
    </div>
  );
}

export default App;
