import "../Design/Settings.css";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../Context/Context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import api from "../API/api.js";

function Settings() {
  const { ldapConfig, user, canEditLDAPSettings, isSiteAdmin } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [viewingPassword, setViewingPassword] = useState(false);

  const [syncingUsers, setSyncingUsers] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState("");

  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedLDAPUser, setSelectedLDAPUser] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);

  const [form, setForm] = useState({
    LDAP_URL: "",
    LDAP_DOMAIN: "",
    LDAP_BASE_DN: "",
    LDAP_USER_SYNC_BASE_DN: "",
    LDAP_BIND_DN: "",
    LDAP_BIND_PASSWORD: "",
    SITE_USER_ROLE: "",
    SITE_ADMIN_ROLE: ""
  });

  useEffect(() => {
    if (!ldapConfig) return;

    setForm({
      LDAP_URL: ldapConfig.LDAP_URL ?? "",
      LDAP_DOMAIN: ldapConfig.LDAP_DOMAIN ?? "",
      LDAP_BASE_DN: ldapConfig.LDAP_BASE_DN ?? "",
      LDAP_USER_SYNC_BASE_DN: ldapConfig.LDAP_USER_SYNC_BASE_DN ?? "",
      LDAP_BIND_DN: ldapConfig.LDAP_BIND_DN ?? "",
      LDAP_BIND_PASSWORD: ldapConfig.LDAP_BIND_PASSWORD ?? "",
      SITE_USER_ROLE: ldapConfig.SITE_USER_ROLE ?? "",
      SITE_ADMIN_ROLE: ldapConfig.SITE_ADMIN_ROLE ?? ""
    });
  }, [ldapConfig]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase().trim();

    if (!term) return users;

    return users.filter(item =>
      item.AD_USERNAME?.toLowerCase().includes(term) ||
      item.DISPLAY_NAME?.toLowerCase().includes(term) ||
      item.EMAIL?.toLowerCase().includes(term) ||
      item.DEPARTMENT?.toLowerCase().includes(term) ||
      item.TITLE?.toLowerCase().includes(term)
    );
  }, [users, userSearch]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleEdit() {
    setIsEditing(true);
    setViewingPassword(false);
  }

  function handleCancel() {
    if (!ldapConfig) return;

    setForm({
      LDAP_URL: ldapConfig.LDAP_URL ?? "",
      LDAP_DOMAIN: ldapConfig.LDAP_DOMAIN ?? "",
      LDAP_BASE_DN: ldapConfig.LDAP_BASE_DN ?? "",
      LDAP_USER_SYNC_BASE_DN: ldapConfig.LDAP_USER_SYNC_BASE_DN ?? "",
      LDAP_BIND_DN: ldapConfig.LDAP_BIND_DN ?? "",
      LDAP_BIND_PASSWORD: ldapConfig.LDAP_BIND_PASSWORD ?? "",
      SITE_USER_ROLE: ldapConfig.SITE_USER_ROLE ?? "",
      SITE_ADMIN_ROLE: ldapConfig.SITE_ADMIN_ROLE ?? ""
    });

    setIsEditing(false);
    setViewingPassword(false);
  }

  async function handleSave() {
    try {
      const {
        LDAP_URL,
        LDAP_DOMAIN,
        LDAP_BASE_DN,
        LDAP_USER_SYNC_BASE_DN,
        LDAP_BIND_DN,
        LDAP_BIND_PASSWORD,
        SITE_USER_ROLE,
        SITE_ADMIN_ROLE
      } = form;

      if (
        !LDAP_URL ||
        !LDAP_DOMAIN ||
        !LDAP_BASE_DN ||
        !LDAP_BIND_DN ||
        !LDAP_BIND_PASSWORD ||
        !SITE_USER_ROLE ||
        !SITE_ADMIN_ROLE
      ) {
        alert("Please fill in all required fields.");
        return;
      }

      const payload = {
        LDAP_URL: LDAP_URL.trim(),
        LDAP_DOMAIN: LDAP_DOMAIN.trim(),
        LDAP_BASE_DN: LDAP_BASE_DN.trim(),
        LDAP_USER_SYNC_BASE_DN: LDAP_USER_SYNC_BASE_DN.trim() || null,
        LDAP_BIND_DN: LDAP_BIND_DN.trim(),
        SITE_USER_ROLE: SITE_USER_ROLE.trim(),
        SITE_ADMIN_ROLE: SITE_ADMIN_ROLE.trim(),
        UPDATED_BY: user?.username
      };

      if (LDAP_BIND_PASSWORD.trim() !== (ldapConfig?.LDAP_BIND_PASSWORD ?? "").trim()) {
        payload.LDAP_BIND_PASSWORD = LDAP_BIND_PASSWORD.trim();
      }

      const response = await api.put("/api/settings", payload);

      alert(response.data?.message || "Settings updated successfully.");

      setIsEditing(false);
      setViewingPassword(false);
    } catch (error) {
      console.error("Error saving settings:", error.response?.data || error.message);

      alert(
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to save settings."
      );
    }
  }

  async function handleSyncLDAPUsers() {
    const syncBase =
      form.LDAP_USER_SYNC_BASE_DN?.trim() ||
      form.LDAP_BASE_DN?.trim();

    const confirmed = window.confirm(
      `Sync users from Active Directory now?\n\nSearch base:\n${syncBase}\n\nThis will create/update users and disable users no longer found in that sync scope.`
    );

    if (!confirmed) return;

    try {
      setSyncingUsers(true);
      setSyncResult(null);
      setSyncError("");

      const res = await api.post("/api/settings/sync-ldap-users", {
        changedBy: user?.username || "SYSTEM"
      });

      setSyncResult(res.data?.result || null);
    } catch (err) {
      console.error("LDAP sync failed:", err.response?.data || err.message);

      setSyncError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "LDAP sync failed."
      );
    } finally {
      setSyncingUsers(false);
    }
  }

  async function openLDAPUsersModal() {
    try {
      setUsersModalOpen(true);
      setUsersLoading(true);
      setUsersError("");
      setUserSearch("");
      setSelectedLDAPUser(null);
      setSelectedUserDetails(null);

      const response = await api.get("/api/settings/ldap-users");
      setUsers(response.data || []);
    } catch (err) {
      console.error("Failed to load LDAP users:", err.response?.data || err.message);
      setUsersError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load users."
      );
    } finally {
      setUsersLoading(false);
    }
  }

  function closeLDAPUsersModal() {
    setUsersModalOpen(false);
    setUsers([]);
    setUserSearch("");
    setSelectedLDAPUser(null);
    setSelectedUserDetails(null);
    setUsersError("");
  }

 function selectLDAPUser(item) {
  setSelectedLDAPUser(item);
  setSelectedUserDetails(null);
  setSelectedUserLoading(false);
}

  function formatDate(value) {
    if (!value) return "N/A";

    try {
      return new Date(value).toLocaleString();
    } catch {
      return "N/A";
    }
  }

  function parseRoles(value) {
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return [String(value)];
    }
  }

  const canManageSettings = canEditLDAPSettings() || isSiteAdmin();

  return (
    <div className="settingsPage">
      <div className="settingsShell">
        <div className="settingsHeader">
          <h1>Settings</h1>
        </div>

        {canManageSettings ? (
          <>
            <div className="settingsContent">
              <section className="settingsCard">
                <h2>Active Directory</h2>

                <div className="settingsField">
                  <label>Server URL</label>
                  <input
                    type="text"
                    name="LDAP_URL"
                    value={form.LDAP_URL}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="settingsField">
                  <label>Domain Name</label>
                  <input
                    type="text"
                    name="LDAP_DOMAIN"
                    value={form.LDAP_DOMAIN}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="settingsField">
                  <label>Base DN</label>
                  <input
                    type="text"
                    name="LDAP_BASE_DN"
                    value={form.LDAP_BASE_DN}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="DC=maets,DC=net"
                  />
                </div>

                <div className="settingsField">
                  <label>User Sync Base DN</label>
                  <input
                    type="text"
                    name="LDAP_USER_SYNC_BASE_DN"
                    value={form.LDAP_USER_SYNC_BASE_DN}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="OU=OnSite,DC=maets,DC=net"
                  />
                  <p className="settingsFieldHint">
                    Optional. Manual LDAP user sync will search this OU. If blank,
                    it falls back to the Base DN.
                  </p>
                </div>

                <div className="settingsField">
                  <label>LDAP Bind DN</label>
                  <input
                    type="text"
                    name="LDAP_BIND_DN"
                    value={form.LDAP_BIND_DN}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="settingsField passwordField">
                  <label>LDAP Bind Password</label>

                  <div className="passwordInputWrap">
                    <input
                      type={viewingPassword ? "text" : "password"}
                      name="LDAP_BIND_PASSWORD"
                      value={form.LDAP_BIND_PASSWORD}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="LDAP bind password"
                    />

                    <button
                      type="button"
                      className="showPassButton"
                      onClick={() => setViewingPassword(prev => !prev)}
                      disabled={!isEditing}
                      title={viewingPassword ? "Hide password" : "Show password"}
                    >
                      <FontAwesomeIcon icon={viewingPassword ? "eye-slash" : "eye"} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="settingsCard">
                <h2>Site</h2>

                <div className="settingsField">
                  <label>Default User Role</label>
                  <input
                    type="text"
                    name="SITE_USER_ROLE"
                    placeholder="CN=Example,DC=CONTOSO,DC=com"
                    value={form.SITE_USER_ROLE}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="settingsField">
                  <label>Admin User Role</label>
                  <input
                    type="text"
                    name="SITE_ADMIN_ROLE"
                    placeholder="CN=Example,DC=CONTOSO,DC=com"
                    value={form.SITE_ADMIN_ROLE}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </section>

              <section className="settingsCard settingsSyncCard">
                <h2>User Sync</h2>

                <p>
                  Manually sync users from Active Directory into the local
                  Users_From_LDAP table. The sync uses the User Sync Base DN when
                  provided.
                </p>

                <div className="settingsSyncBasePreview">
                  <span>Searching:</span>
                  <strong>
                    {form.LDAP_USER_SYNC_BASE_DN?.trim() ||
                      form.LDAP_BASE_DN?.trim() ||
                      "Not configured"}
                  </strong>
                </div>

                <div className="settingsSyncButtons">
                  <button
                    type="button"
                    className="syncUsersButton"
                    onClick={handleSyncLDAPUsers}
                    disabled={syncingUsers}
                  >
                    {syncingUsers ? "Syncing Users..." : "Sync Users From LDAP"}
                  </button>

                  <button
                    type="button"
                    className="ViewLDAPUsersButton"
                    onClick={openLDAPUsersModal}
                  >
                    View Users
                  </button>
                </div>

                {syncError && (
                  <div className="settingsSyncError">
                    {syncError}
                  </div>
                )}

                {syncResult && (
                  <div className="settingsSyncResult">
                    <div>
                      <span>LDAP Users Found</span>
                      <strong>{syncResult.totalFromLDAP}</strong>
                    </div>

                    <div>
                      <span>Created</span>
                      <strong>{syncResult.created}</strong>
                    </div>

                    <div>
                      <span>Updated</span>
                      <strong>{syncResult.updated}</strong>
                    </div>

                    <div>
                      <span>Disabled</span>
                      <strong>{syncResult.disabled}</strong>
                    </div>

                    <div>
                      <span>Skipped</span>
                      <strong>{syncResult.skipped}</strong>
                    </div>

                    <div>
                      <span>Errors</span>
                      <strong>{syncResult.errors?.length || 0}</strong>
                    </div>
                  </div>
                )}

                {syncResult?.errors?.length > 0 && (
                  <div className="settingsSyncErrorsList">
                    {syncResult.errors.map((err, index) => (
                      <div key={`${err.username}-${index}`}>
                        <strong>{err.username}</strong>
                        <span>{err.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="settingsActions">
              {!isEditing ? (
                <button type="button" onClick={handleEdit}>
                  Edit Settings
                </button>
              ) : (
                <>
                  <button id="saveButton" type="button" onClick={handleSave}>
                    Save Settings
                  </button>

                  <button id="cancelButton" type="button" onClick={handleCancel}>
                    Cancel
                  </button>
                </>
              )}
            </div>

            {usersModalOpen && (
              <div className="ldapUsersListDiv">
                <div className="ldapUsersListWrapper">
                  <div className="ldapUsersHeader">
                    <div>
                      <h2>Users from LDAP</h2>
                      <p>{users.length} users loaded</p>
                    </div>

                    <button type="button" onClick={closeLDAPUsersModal}>
                      ×
                    </button>
                  </div>

                  <div className="ldapUsersToolbar">
                    <input
                      value={userSearch}
                      onChange={event => setUserSearch(event.target.value)}
                      placeholder="Search users..."
                    />
                  </div>

                  {usersError && (
                    <div className="settingsSyncError">
                      {usersError}
                    </div>
                  )}

                  <div className="ldapUsersModalGrid">
                    <div className="ldapUsersListPanel">
                      {usersLoading ? (
                        <div className="ldapUsersEmpty">Loading users...</div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="ldapUsersEmpty">No users found.</div>
                      ) : (
                        <ul className="ldapList">
                          {filteredUsers.map(item => (
                            <li key={item.Id}>
                              <button
                                type="button"
                                className={
                                  selectedLDAPUser?.Id === item.Id
                                    ? "ldapUserItem active"
                                    : "ldapUserItem"
                                }
                                onClick={() => selectLDAPUser(item)}
                              >
                                <strong>{item.DISPLAY_NAME || item.AD_USERNAME}</strong>
                                <span>{item.AD_USERNAME}</span>
                                <small>{item.EMAIL || "No email"}</small>
                                {!item.IS_ENABLED && (
                                  <em>Disabled</em>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="ldapUserDetailsPanel">
                      {!selectedLDAPUser ? (
                        <div className="ldapUsersEmpty">
                          Click a user to view details and associated inventory.
                        </div>
                      ) : selectedUserLoading ? (
                        <div className="ldapUsersEmpty">
                          Loading user details...
                        </div>
                      ) : (
                        <>
                          <div className="ldapUserProfile">
                            <h3>
                              {selectedLDAPUser.DISPLAY_NAME ||
                                selectedLDAPUser.AD_USERNAME}
                            </h3>

                            <p>{selectedLDAPUser.EMAIL || "No email"}</p>

                            <div className="ldapUserMetaGrid">
                              <div>
                                <span>Username</span>
                                <strong>{selectedLDAPUser.AD_USERNAME}</strong>
                              </div>

                              <div>
                                <span>Status</span>
                                <strong>
                                  {selectedLDAPUser.IS_ENABLED ? "Enabled" : "Disabled"}
                                </strong>
                              </div>

                              <div>
                                <span>First Name</span>
                                <strong>{selectedLDAPUser.GIVEN_NAME || "N/A"}</strong>
                              </div>

                              <div>
                                <span>Last Name</span>
                                <strong>{selectedLDAPUser.SURNAME || "N/A"}</strong>
                              </div>

                              <div>
                                <span>Department</span>
                                <strong>{selectedLDAPUser.DEPARTMENT || "N/A"}</strong>
                              </div>

                              <div>
                                <span>Title</span>
                                <strong>{selectedLDAPUser.TITLE || "N/A"}</strong>
                              </div>

                              <div>
                                <span>Employee ID</span>
                                <strong>{selectedLDAPUser.EMPLOYEE_ID || "N/A"}</strong>
                              </div>

                              <div>
                                <span>Last Login</span>
                                <strong>{formatDate(selectedLDAPUser.LAST_LOGIN)}</strong>
                              </div>

                              <div>
                                <span>Last AD Sync</span>
                                <strong>{formatDate(selectedLDAPUser.LAST_AD_SYNC)}</strong>
                              </div>

                              <div>
                                <span>Created</span>
                                <strong>{formatDate(selectedLDAPUser.CREATED_AT)}</strong>
                              </div>
                            </div>

                            <div className="ldapUserDnBlock">
                              <span>Distinguished Name</span>
                              <strong>{selectedLDAPUser.DISTINGUISHED_NAME || "N/A"}</strong>
                            </div>

                            <div className="ldapUserDnBlock">
                              <span>Manager DN</span>
                              <strong>{selectedLDAPUser.MANAGER_DN || "N/A"}</strong>
                            </div>
                          </div>


                          <div className="ldapAssociatedSection">
                            <h3>Roles</h3>

                            <div className="ldapRoleList">
                              {parseRoles(selectedLDAPUser.USER_ROLES).length === 0 ? (
                                <span>No roles stored.</span>
                              ) : (
                                parseRoles(selectedLDAPUser.USER_ROLES).map((role, index) => (
                                  <span key={`${role}-${index}`}>
                                    {role}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="settingsNoAccess">
            You do not have permission to manage settings.
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;