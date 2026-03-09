
import '../Design/MainLayout.css'
import Logo from '../assets/Logo.avif'
import { Link, Route, Routes } from 'react-router'
import { useNavigate } from 'react-router'
function MainLayout() {
 return (
    <>
    <div id='logoDiv'>
            <img id='MAETSLOGO' src={Logo} alt='MAETS LOGO'/>
    </div>
    <header>
          <nav>
                <Link className='navigationLink' to='/home'>Home</Link>
                <Link className='navigationLink' to='/about'>About</Link>
                <Link className='navigationLink' to='/home'>OpenKM</Link>
                <Link className='navigationLink' to='/home'>Directory</Link>
        </nav> 
    </header>
           
    
    
    </>
 )
  
}

export default MainLayout