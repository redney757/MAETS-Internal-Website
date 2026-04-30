import "../Design/Account.css";
import { useAuth } from "../../Context/Context";

function Account() {
  const { user } = useAuth();

  return (
    <div className="accountPage"> <h1>My Account</h1>
      <div className="accountContainer">
        
        
        {/* LEFT PANEL */}
        <div className="accountSidebar">
          <div className="accountAvatar">
            {user?.displayName?.charAt(0) || "U"}
          </div>

          <h2>{user?.displayName}</h2>
          <p className="accountEmail">{user?.email}</p>

          <div className="accountStats">
            <div>
              <span>Role</span>
              <p>{user?.groups?.includes("CN=Domain Admins,CN=Users,DC=maets,DC=net") ? "Admin" : "User"}</p>
            </div>
          
          </div>
        </div>
        {/* RIGHT PANEL */}
        <div className="accountDetails">
         

          <div className="accountCard">
            <h3>User Information</h3>

            <div className="accountRow">
              <label>Username</label>
              <p>{user?.username}</p>
            </div>

            <div className="accountRow">
              <label>Display Name</label>
              <p>{user?.displayName}</p>
            </div>

            <div className="accountRow">
              <label>Email</label>
              <p>{user?.email}</p>
            </div>
            <div className="accountRow">
                <label>Manager</label>
                <p>{user?.manager}</p>
            </div>
            </div>
          <div className="accountCard">
            <h3>Groups</h3>
            <div className="groupList">
              {user?.groups?.map((group, index) => (
                <div key={index} className="groupItem">
                  {group}
                </div>
              ))}
            </div>
          </div>
        </div>
        

      </div>
    </div>
  );
}

export default Account;