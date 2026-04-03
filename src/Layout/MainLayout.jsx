
import '../Design/MainLayout.css'
import Logo from '../assets/Logo.avif'
import { Link } from "react-router";
import { useAuth } from "../../Context/Context";
import { useNavigate } from 'react-router'
function MainLayout() {
         const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
 return (
    <>
    <div id='sideNAVDiv'>
       <div id='navWrapper'>
          <nav id='mainNav'>
                <Link className='navigationLink' to='/'>Home</Link>
                <Link className='navigationLink' to='/about'>About</Link>
                <Link className='navigationLink' to='/home'>OpenKM</Link>
                <Link className='navigationLink' to='/directory'>Directory</Link>
                 {user ? console.log("User in MainLayout:", user): console.log("No user in MainLayout")}
                {
                       
                        user ? (
                                <>
                                <Link className='navigationLink' to='/myAccount'>Account</Link>
                                <button onClick={handleLogout}>Logout</button>
                                
                                </>
                        ):(
                                <>
                                <Link className='navigationLink' to='/login'>Login</Link>
                                </>
                        )

                }
               
             
                
        </nav> 
        </div>
    </div>
    {/* <div id='headerDiv'>
         <header>

    <div id='logoDiv'>
            <img id='MAETSLOGO' src={Logo} alt='MAETS LOGO'/>
    </div>
          <nav>
                <Link className='navigationLink' to='/'>Home</Link>
                <Link className='navigationLink' to='/about'>About</Link>
                <Link className='navigationLink' to='/home'>OpenKM</Link>
                <Link className='navigationLink' to='/directory'>Directory</Link>
                 {user ? console.log("User in MainLayout:", user): console.log("No user in MainLayout")}
                {
                       
                        user ? (
                                <>
                                <Link className='navigationLink' to='/myAccount'>Account</Link>
                                <button onClick={handleLogout}>Logout</button>
                                
                                </>
                        ):(
                                <>
                                <Link className='navigationLink' to='/api/login'>Login</Link>
                                </>
                        )

                }
               
             
                
        </nav> 
    </header> */}
           
    
    
    </>
 )
  
}

export default MainLayout