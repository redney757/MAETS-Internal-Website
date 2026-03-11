import { useEffect, useState } from 'react'
import '../Design/Directory.css'
import axios from 'axios'
import { useContext } from 'react'
import { AuthContext } from '../../Context/Context'
import { data } from 'react-router'
function Directory() {
    
   const { pbxUsers, pbxLoading, pbxError } = useContext(AuthContext);
   const [filter, setFilter] = useState("")
   const searchInput = document.getElementById("searchBar")
   const handleFilterChange = (event) => {
    setFilter(event.target.value);
   }
   const filteredItems = pbxUsers.filter(item => {
    return item.default_extension.toLowerCase().includes(filter.toLowerCase()) || item.displayname.toLowerCase().includes(filter.toLowerCase())
   })
   

    return (
        <>
                <div id="directoryPageDiv">
                    <input id='searchBar' type="text" placeholder='Search' value={filter} onChange={handleFilterChange}/>
            <div id="pbxusers">
                {searchInput ? 
                
  filteredItems.map((user) => (
                    <div className="pbxUsers" key={user.id}>
                        <div>{user.displayname}</div>
                        <div>{user.cell}</div>
                        <div>{user.title}</div>
                        <div>{user.default_extension}</div>
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