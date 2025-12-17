import React from 'react'
import Weather from './components/Weather'
import Splash from './components/Splash'
import InstallPrompt from './components/InstallPrompt'

const App = () => {
  return (
    <div className='app'>
      <Splash/>
      <Weather/>
      <InstallPrompt/>

    </div>
  )

}

export default App