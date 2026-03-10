import { useEffect, useState } from 'react'
import '../Design/Directory.css'
import axios from 'axios'
import { useContext } from 'react'
import { AuthContext } from '../../Context/Context'
function Directory() {
    
   const { pbxUsers, pbxLoading, pbxError } = useContext(AuthContext);
    console.log(pbxUsers)

    return (
        <>
            <div id='directoryPageDiv'>
                <div id="directoryPageDiv">
            <div id="pbxusers">
                {pbxUsers.map((user) => (
                    <div className="pbxUsers" key={user.id}>
                        <div>{user.displayname}</div>
                        <div>{user.cell}</div>
                        <div>{user.title}</div>
                        <div>{user.default_extension}</div>
                    </div>
                ))}
            </div>
        </div>
            </div>
        
        </>
    )

}
export default Directory