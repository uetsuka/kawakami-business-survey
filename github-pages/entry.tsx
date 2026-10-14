import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import '../app/survey.css';
import '../app/header.css';
createRoot(document.getElementById('root')!).render(<Home/>);
