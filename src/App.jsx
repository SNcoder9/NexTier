import { useState } from 'react'
import './App.css'
import { Route, Routes } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Workout from './pages/Workout'
import Diet from './pages/Diet'
import Navbar from './components/Navbar'
import logo from './assets/logo.png'
import profile from './assets/picture.jpg'
import background from './assets/background.jpg'

function App() {
  const user = {
    name: 'Neelesh Sharma',
    pic: profile
  };

  return (
    <>
      <Navbar logo={logo} user={user}/>
      <main style={{ 
        // The gradient goes first, then the image
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,1) 100%), url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100vh',
        width: '100%'
      }}>
        <Routes>
          <Route path='/' element={<Dashboard/>} /> 
          <Route path='/workout' element={<Workout/>} />
          <Route path='/diet' element={<Diet/>} />
        </Routes>
      </main>
    </>
  )
}

export default App
