import React, { useState } from 'react';
import Editor from './Editor';

const App = () => {
  const [notes, setNotes] = useState([]);
  const [currentNote, setCurrentNote] = useState('');

  const addNote = () => {
    if (currentNote.trim() !== '') {
      setNotes([...notes, currentNote]);
      setCurrentNote('');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Editor />
      <div className='footer fixed bottom-0 border-t bg-inherit border-gray-200 p-1 pl-4 left-0 right-0'>
        <a href="https://github.com/mdsaban/aptus-vs-code/issues" target="_blank" rel="noopener noreferrer">Report an issue</a>
      </div>
    </div>
  );
};

export default App;
