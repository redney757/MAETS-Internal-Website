import { useEffect, useState } from 'react'
import '../Design/Directory.css'
import api from '../API/api.js'
import { useContext } from 'react'
import { AuthContext } from '../../Context/Context'
import { data } from 'react-router'

function Directory() {
   
   const [pbxUsers, setPBXUsers] = useState([]);
    const [pbxLoading, setPBXLoading] = useState(false);
    const [pbxError, setPBXError] = useState(null);

const loadPBXUsers = async () => {
        try {
          

            const response = await api.get("/api/pbx/users");
            console.log("PBX response:", response.data);
            const sortedPBXUsers = response.data.sort((a,b)=> {
                return a.displayname.localeCompare(b.displayname)
            })
            console.log(sortedPBXUsers)
            setPBXUsers(Array.isArray(sortedPBXUsers) ? response.data : []);
        } catch (error) {
            console.error("PBX load error:", error.response?.data || error.message);
            setPBXError(error.response?.data || error.message);
        } finally {
            setPBXLoading(false);
        }
};


   useEffect(() => {
           loadPBXUsers();
       }, []);
   
   const [filter, setFilter] = useState("")
   const searchInput = document.getElementById("searchBar")
   const handleFilterChange = (event) => {
    setFilter(event.target.value);
   }
   const filteredItems = pbxUsers.filter(item => {
    return ((item.cell || '').toLowerCase().includes(filter.toLowerCase()) || (item.default_extension || '').toLowerCase().includes(filter.toLowerCase()) || (item.displayname || '').toLowerCase().includes(filter.toLowerCase()) || (item.title || '').toLowerCase().includes(filter.toLowerCase()) || (item.work || '' ).toLowerCase().includes(filter.toLowerCase()))
   })
   

    return (
        <>
                <div id="directoryPageDiv">
                    <div id="searchHeaderDiv">
                        <input id='searchBar' type="text" placeholder='Search' value={filter} onChange={handleFilterChange}/>
                        <div id="titleDiv">

                            <h3>Name</h3>
                        <h3>Cell</h3>
                        <h3>DID</h3>
                        <h3>Title</h3>
                        <h3>Extension</h3>
                        </div>
                        

                    </div>
                  
            <div id="pbxusersDiv">
               
                {searchInput ? 
                
  filteredItems.map((user) => (
                    <div className="pbxUsers" key={user.id}>
                        <div className='pbxUserInfo'>{user.displayname}</div>
                        <div className='pbxUserInfo'>{user.cell ? user.cell : <div>-</div>}</div>
                        <div className='pbxUserInfo'> {user.work ? <div> {user.work}</div>
                         :
                          <div>-</div>}
                          </div>
                        <div className='pbxUserInfo'>{user.title ? user.title : <div>-</div>}</div>
                        <div className='pbxUserInfo'>{user.default_extension  === "none" ? 
                        <div>-</div>
                         :
                          <div>{user.default_extension}</div>
                            }</div>
                    </div>
                )) 
                                : 
                 
                  pbxUsers.map((user) => (
                    <div className="pbxUsers" key={user.id}>
                        <div>{user.displayname}</div>
                        <div>{user.cell}</div>
                        <div>{user.title}</div>
                        <div>{user.default_extension}</div>
                    </div>
                  ))
                }
            </div>
        </div>
                   
        </>
    )

}
export default Directory