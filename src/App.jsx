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
      <main className='w-screen h-screen'>
        <div className='px-8 py-2.5'>
          <Routes>
            <Route path='/' element={<Dashboard user={user}/>} /> 
            <Route path='/workout' element={<Workout/>} />
            <Route path='/diet' element={<Diet/>} />
          </Routes>
        </div>
      </main>
    </>
  )
}

export default App
