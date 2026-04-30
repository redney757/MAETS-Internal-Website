
import '../Design/MainLayout.css'
import Logo from '../assets/Logo.avif'
import { Link, replace } from "react-router";
import { useAuth } from "../../Context/Context";
import { useNavigate } from 'react-router'
import { useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";




function MainLayout() {
        const { user, logout } = useAuth();

        const handleLogout = async () => {
                try { 
                        console.log("Logging out user:", user);
                        await logout();
                } catch (err) {
                        console.error("Logout failed:", err);
                }
        
        };
        const navLinks = {
                '/': '.navigationLink.home',
                '/home': '.navigationLink.openkm',
                '/directory': '.navigationLink.directory',
                '/inventory-management' : '.navigationLink.inventory',
                '/myAccount': '.navigationLink.myAccount',
                '/settings': '.navigationLink.settings',
                '/login': '.navigationLink.login'
        };

        const currentPath = window.location.pathname;
        const selectedSelector = navLinks[currentPath];
        if (selectedSelector) {
                document.querySelectorAll('.navigationLink').forEach(link => {
                        link.classList.remove('selected');
                });
                const selectedLink = document.querySelector(selectedSelector);
                if (selectedLink) {
                        selectedLink.classList.add('selected');
                }
        }

        useEffect(()=> {
        
                
        },[window.location.pathname])

     
 return (
    <>
    
        
        <header id='headerDiv' className='header'>
                <div id='logoDiv'>
                        <img id='MAETSLOGO' src={Logo} alt='MAETS LOGO'/>
                </div>
        </header>
    
    <div className='sideNAVDiv nav'>
        <div id='closeButtonWrapper'>
        <button id='collapseNavButton' onClick={()=> {
                        const getSideNav = document.querySelector('.sideNAVDiv');
                        const getNavLinks = document.querySelectorAll('.navigationLink');
                        const getRootElement = document.getElementById('root');
                        const collapseNavButton = document.getElementById('collapseNavButton');
                        getSideNav.classList.toggle('collapsed');
                      
                        if(getSideNav.classList.contains('collapsed')) {
                                getRootElement.classList.add('collapsed')
                                collapseNavButton.innerHTML = '&rarr;';
                                getNavLinks.forEach(link => {
                                        link.classList.add('collapsed');
                                });
                        } else {
                                getRootElement.classList.remove('collapsed')
                                collapseNavButton.innerHTML = '&larr;';
                                getNavLinks.forEach(link => {
                                        link.classList.remove('collapsed');
                                });
                        }
                }}>&larr;</button>
        </div>
        <div id='navWrapper'>
                 <nav id='mainNav'>
                <Link className='navigationLink home' to='/'>
                        <FontAwesomeIcon icon="home" />
                        <span className='navText'>Dashboard</span>
                </Link>
                
                <Link className='navigationLink directory' to='/directory'>
                        <FontAwesomeIcon icon="contact-book"/>
                        <span className='navText'>Directory</span>
                </Link>
                 {user ? console.log("User in MainLayout:", user): console.log("No user in MainLayout")}
                {
                       
                        user ? (
                                <Link className='navigationLink inventory' to='/inventory-management'>
                                        <FontAwesomeIcon icon="boxes"/>
                                        <span className='navText'>Inventory</span>
                                </Link>
                        ) : (
                                null
                        )}
                
                

             
                 {user ? console.log("User in MainLayout:", user): console.log("No user in MainLayout")}
                {
                       
                        user ? (
                                
                                <div id='accountLogoutDiv'>
                                        
                                       
                                        <div id='navLinkWrapper'>
                                                <Link className='navigationLink myAccount' to='/myAccount'>
                                                        <FontAwesomeIcon icon="user"/>
                                                        <span className='navText'>Account</span>
                                                </Link>
                                                <Link className='navigationLink settings' to='/settings'><FontAwesomeIcon icon="cogs"/> <span className='navText'>Settings</span></Link>

                                        </div>
                                        <button className='navigationLink logout' onClick={handleLogout}>
                                                <FontAwesomeIcon icon="sign-out-alt"/>
                                                <span className='navText'>Logout</span>
                                        </button>
                                </div>
                        ):(
                                <div id='loginDiv'>
                                        <hr></hr>
                                     
                                <Link className='navigationLink login' to='/login'>Login</Link>
                                </div>
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