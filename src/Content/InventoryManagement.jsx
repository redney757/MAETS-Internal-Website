import "../Design/InventoryManagement.css";
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import api from "../API/api.js";

const emptyAsset = {
  assetTag: "",
  deviceName: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  licenseKey: "",
  licenseType: "",
  licenseSeats: "",
  licenseUsedSeats: "",
  vendor: "",
  renewalDate: "",
  expirationDate: "",
  subscriptionId: "",
  softwareVersion: "",
  downloadUrl: "",
  status: "Available",
  condition: "",
  purchaseDate: "",
  warrantyEndDate: "",
  cost: "",
  location: "",
  notes: ""
};

export default function InventoryManagement() {
  const [tree, setTree] = useState([]);
  const [summary, setSummary] = useState(null);
  const [view, setView] = useState("categories");

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignAsset, setAssignAsset] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const [assetUserSearch, setAssetUserSearch] = useState("");
  const [assetUserResults, setAssetUserResults] = useState([]);
  const [assetAssignedUser, setAssetAssignedUser] = useState(null);
  const [assetAssignNotes, setAssetAssignNotes] = useState("");

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    sortOrder: 0
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    name: "",
    description: "",
    sortOrder: 0
  });

  const [assetForm, setAssetForm] = useState(emptyAsset);

  useEffect(() => {
    loadInventory(null, null, "categories");
  }, []);

  const selectedCategory = useMemo(() => {
    return tree.find(category => category.id === selectedCategoryId) || null;
  }, [tree, selectedCategoryId]);

  const selectedSubcategory = useMemo(() => {
    return (
      selectedCategory?.subcategories?.find(
        subcategory => subcategory.id === selectedSubcategoryId
      ) || null
    );
  }, [selectedCategory, selectedSubcategoryId]);

  const categoryName = selectedCategory?.name?.toLowerCase() || "";

  const isSoftware =
    categoryName.includes("software") ||
    categoryName.includes("license") ||
    categoryName.includes("certificate") ||
    categoryName.includes("subscription");

  const visibleCategories = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return tree;

    return tree.filter(category =>
      category.name?.toLowerCase().includes(term) ||
      category.description?.toLowerCase().includes(term)
    );
  }, [tree, search]);

  const visibleSubcategories = useMemo(() => {
    const subcategories = selectedCategory?.subcategories || [];
    const term = search.toLowerCase().trim();

    if (!term) return subcategories;

    return subcategories.filter(subcategory =>
      subcategory.name?.toLowerCase().includes(term) ||
      subcategory.description?.toLowerCase().includes(term)
    );
  }, [selectedCategory, search]);

  const visibleAssets = useMemo(() => {
    const assets = selectedSubcategory?.assets || [];
    const term = search.toLowerCase().trim();

    if (!term) return assets;

    return assets.filter(asset =>
      asset.assetTag?.toLowerCase().includes(term) ||
      asset.deviceName?.toLowerCase().includes(term) ||
      asset.serialNumber?.toLowerCase().includes(term) ||
      asset.manufacturer?.toLowerCase().includes(term) ||
      asset.model?.toLowerCase().includes(term) ||
      asset.vendor?.toLowerCase().includes(term) ||
      asset.licenseKey?.toLowerCase().includes(term) ||
      asset.assignedToDisplayName?.toLowerCase().includes(term)
    );
  }, [selectedSubcategory, search]);

  async function loadInventory(
    nextCategoryId = selectedCategoryId,
    nextSubcategoryId = selectedSubcategoryId,
    nextView = view
  ) {
    try {
      const [treeRes, summaryRes] = await Promise.all([
        api.get("/api/inventory/tree"),
        api.get("/api/inventory/summary")
      ]);

      const freshTree = treeRes.data || [];

      setTree(freshTree);
      setSummary(summaryRes.data || null);

      if (!nextCategoryId) {
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
        setView(nextView || "categories");
        return;
      }

      const freshCategory = freshTree.find(category => category.id === nextCategoryId);

      if (!freshCategory) {
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
        setView("categories");
        return;
      }

      setSelectedCategoryId(nextCategoryId);

      if (!nextSubcategoryId) {
        setSelectedSubcategoryId(null);
        setView(nextView || "subcategories");
        return;
      }

      const freshSubcategory = freshCategory.subcategories?.find(
        subcategory => subcategory.id === nextSubcategoryId
      );

      if (!freshSubcategory) {
        setSelectedSubcategoryId(null);
        setView("subcategories");
        return;
      }

      setSelectedSubcategoryId(nextSubcategoryId);
      setView(nextView || "assets");
    } catch (err) {
      console.error(err);
      setMessage("Failed to load inventory.");
    }
  }

  function resetAssetAssignmentState() {
    setAssetUserSearch("");
    setAssetUserResults([]);
    setAssetAssignedUser(null);
    setAssetAssignNotes("");
  }

  function resetForms() {
    setCategoryForm({
      name: "",
      description: "",
      sortOrder: 0
    });

    setSubcategoryForm({
      name: "",
      description: "",
      sortOrder: 0
    });

    setAssetForm(emptyAsset);
    setEditingRecord(null);
    resetAssetAssignmentState();
  }

  function openModal(mode, record = null) {
    resetForms();
    setModalMode(mode);
    setEditingRecord(record);

    if (mode === "edit-category" && record) {
      setCategoryForm({
        name: record.name || "",
        description: record.description || "",
        sortOrder: record.sortOrder || 0
      });
    }

    if (mode === "edit-subcategory" && record) {
      setSubcategoryForm({
        name: record.name || "",
        description: record.description || "",
        sortOrder: record.sortOrder || 0
      });
    }

    if (mode === "edit-asset" && record) {
      setAssetForm({
        assetTag: record.assetTag || "",
        deviceName: record.deviceName || "",
        serialNumber: record.serialNumber || "",
        manufacturer: record.manufacturer || "",
        model: record.model || "",
        licenseKey: record.licenseKey || "",
        licenseType: record.licenseType || "",
        licenseSeats: record.licenseSeats || "",
        licenseUsedSeats: record.licenseUsedSeats || "",
        vendor: record.vendor || "",
        renewalDate: record.renewalDate?.slice?.(0, 10) || "",
        expirationDate: record.expirationDate?.slice?.(0, 10) || "",
        subscriptionId: record.subscriptionId || "",
        softwareVersion: record.softwareVersion || "",
        downloadUrl: record.downloadUrl || "",
        status: record.status || "Available",
        condition: record.condition || "",
        purchaseDate: record.purchaseDate?.slice?.(0, 10) || "",
        warrantyEndDate: record.warrantyEndDate?.slice?.(0, 10) || "",
        cost: record.cost || "",
        location: record.location || "",
        notes: record.notes || ""
      });
    }

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalMode("");
    resetForms();
  }

  function openCategory(category) {
    setSelectedCategoryId(category.id);
    setSelectedSubcategoryId(null);
    setSearch("");
    setView("subcategories");
  }

  function openSubcategory(subcategory) {
    setSelectedSubcategoryId(subcategory.id);
    setSearch("");
    setView("assets");
  }

  function backToCategories() {
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setSearch("");
    setView("categories");
  }

  function backToSubcategories() {
    setSelectedSubcategoryId(null);
    setSearch("");
    setView("subcategories");
  }

  function handleAdd() {
    if (view === "categories") {
      openModal("create-category");
      return;
    }

    if (view === "subcategories") {
      openModal("create-subcategory");
      return;
    }

    openModal("create-asset");
  }

  function getAddLabel() {
    if (view === "categories") return "Add Category";
    if (view === "subcategories") return "Add Subcategory";
    return "Add Asset";
  }

  function handleAssetStatusChange(nextStatus) {
    setAssetForm(prev => ({
      ...prev,
      status: nextStatus
    }));

    if (nextStatus !== "Assigned") {
      resetAssetAssignmentState();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      if (modalMode === "create-category") {
        const res = await api.post("/api/inventory/categories", categoryForm);
        const newCategoryId = res.data.Id || res.data.id;

        setMessage("Category created.");
        closeModal();
        await loadInventory(newCategoryId, null, "subcategories");
        return;
      }

      if (modalMode === "edit-category") {
        await api.put(`/api/inventory/categories/${editingRecord.id}`, categoryForm);

        setMessage("Category updated.");
        closeModal();
        await loadInventory(editingRecord.id, null, "subcategories");
        return;
      }

      if (modalMode === "create-subcategory") {
        const res = await api.post("/api/inventory/subcategories", {
          ...subcategoryForm,
          categoryId: selectedCategory.id
        });

        const newSubcategoryId = res.data.Id || res.data.id;

        setMessage("Subcategory created.");
        closeModal();
        await loadInventory(selectedCategory.id, newSubcategoryId, "assets");
        return;
      }

      if (modalMode === "edit-subcategory") {
        await api.put(`/api/inventory/subcategories/${editingRecord.id}`, {
          ...subcategoryForm,
          categoryId: selectedCategory.id
        });

        setMessage("Subcategory updated.");
        closeModal();
        await loadInventory(selectedCategory.id, editingRecord.id, "assets");
        return;
      }

      if (modalMode === "create-asset") {
        if (assetForm.status === "Assigned" && !assetAssignedUser) {
          setMessage("Select a user before saving an assigned asset.");
          return;
        }

        const res = await api.post("/api/inventory/assets", {
          ...assetForm,
          status: assetForm.status,
          subcategoryId: selectedSubcategory.id
        });

        const newAssetId = res.data.Id || res.data.id;

        if (assetForm.status === "Assigned" && assetAssignedUser) {
          await api.post(`/api/inventory/assets/${newAssetId}/assign`, {
            userId: assetAssignedUser.Id,
            notes: assetAssignNotes
          });
        }

        setMessage(
          assetForm.status === "Assigned"
            ? "Asset created and assigned."
            : "Asset created."
        );

        closeModal();
        await loadInventory(selectedCategory.id, selectedSubcategory.id, "assets");
        return;
      }

      if (modalMode === "edit-asset") {
        await api.put(`/api/inventory/assets/${editingRecord.id}`, {
          ...assetForm,
          subcategoryId: selectedSubcategory.id
        });

        setMessage("Asset updated.");
        closeModal();
        await loadInventory(selectedCategory.id, selectedSubcategory.id, "assets");
      }
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Save failed.");
    }
  }

  async function handleDelete(type, record) {
    const label = record.name || record.assetTag || "record";

    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      if (type === "category") {
        await api.delete(`/api/inventory/categories/${record.id}`);
        setMessage("Category deleted.");
        await loadInventory(null, null, "categories");
        return;
      }

      if (type === "subcategory") {
        await api.delete(`/api/inventory/subcategories/${record.id}`);
        setMessage("Subcategory deleted.");
        await loadInventory(selectedCategory.id, null, "subcategories");
        return;
      }

      if (type === "asset") {
        await api.delete(`/api/inventory/assets/${record.id}`);
        setMessage("Asset deleted.");
        await loadInventory(selectedCategory.id, selectedSubcategory.id, "assets");
      }
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Delete failed.");
    }
  }

  async function handleDecommission(asset) {
    const reason = window.prompt("Reason for decommission?");
    if (reason === null) return;

    try {
      await api.put(`/api/inventory/assets/${asset.id}/decommission`, {
        reason
      });

      setMessage("Asset decommissioned.");
      await loadInventory(selectedCategory.id, selectedSubcategory.id, "assets");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Decommission failed.");
    }
  }

  function openAssignModal(asset) {
    setAssignAsset(asset);
    setUserSearch("");
    setUserResults([]);
    setSelectedUser(null);
    setAssignmentNotes("");
    setAssignModalOpen(true);
  }

  function closeAssignModal() {
    setAssignModalOpen(false);
    setAssignAsset(null);
    setUserSearch("");
    setUserResults([]);
    setSelectedUser(null);
    setAssignmentNotes("");
  }

  async function searchUsers() {
    try {
      const res = await api.get("/api/inventory/users/search", {
        params: { q: userSearch }
      });

      setUserResults(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage("User search failed.");
    }
  }

  async function searchAssetUsers() {
    try {
      const res = await api.get("/api/inventory/users/search", {
        params: { q: assetUserSearch }
      });

      setAssetUserResults(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage("User search failed.");
    }
  }

  async function handleAssignSubmit(event) {
    event.preventDefault();

    if (!assignAsset || !selectedUser) {
      setMessage("Select a user first.");
      return;
    }

    try {
      await api.post(`/api/inventory/assets/${assignAsset.id}/assign`, {
        userId: selectedUser.Id,
        notes: assignmentNotes
      });

      setMessage("Asset assigned.");
      closeAssignModal();
      await loadInventory(selectedCategory.id, selectedSubcategory.id, "assets");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Assign failed.");
    }
  }

  async function handleReturnAsset(asset) {
    if (!window.confirm(`Return ${asset.assetTag}?`)) return;

    try {
      await api.put(`/api/inventory/assets/${asset.id}/return`, {
        notes: ""
      });

      setMessage("Asset returned.");
      await loadInventory(selectedCategory.id, selectedSubcategory.id, "assets");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Return failed.");
    }
  }

  return (
    <main className="inventory-page">
      <section className="inventory-shell">
        <header className="inventory-header">
          <div>
            <h1 className="inventory-header-title">Inventory Management</h1>
            <p className="inventory-header-subtitle">
              Browse inventory by category, subcategory, and asset.
            </p>
          </div>

          <div className="inventory-header-actions">
            <button type="button" onClick={handleAdd}>
              <FontAwesomeIcon icon="plus" />
              <span>{getAddLabel()}</span>
            </button>
          </div>
        </header>

        {message && <div className="inventory-message">{message}</div>}

        <div className="inventory-content">
          <section className="inventory-stats-grid">
            <div className="inventory-stat-card">
              <span>Categories</span>
              <strong>{summary?.TotalCategories || 0}</strong>
            </div>

            <div className="inventory-stat-card">
              <span>Subcategories</span>
              <strong>{summary?.TotalSubcategories || 0}</strong>
            </div>

            <div className="inventory-stat-card">
              <span>Active Assets</span>
              <strong>{summary?.ActiveAssets || 0}</strong>
            </div>

            <div className="inventory-stat-card">
              <span>Assigned</span>
              <strong>{summary?.AssignedAssets || 0}</strong>
            </div>
          </section>

          <section className="inventory-panel inventory-browser-panel">
            <div className="inventory-panel-heading">
              <div>
                <h2>
                  {view === "categories" && "Categories"}
                  {view === "subcategories" && selectedCategory?.name}
                  {view === "assets" && selectedSubcategory?.name}
                </h2>

                <p>
                  {view === "categories" && "Choose a category to view subcategories."}
                  {view === "subcategories" && "Choose a subcategory to view assets."}
                  {view === "assets" &&
                    `${selectedCategory?.name} / ${selectedSubcategory?.name}`}
                </p>
              </div>

              <div className="inventory-heading-actions">
                {view === "subcategories" && (
                  <>
                    <button type="button" onClick={backToCategories}>
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => openModal("edit-category", selectedCategory)}
                    >
                      Edit Category
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete("category", selectedCategory)}
                    >
                      Delete Category
                    </button>
                  </>
                )}

                {view === "assets" && (
                  <>
                    <button type="button" onClick={backToSubcategories}>
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => openModal("edit-subcategory", selectedSubcategory)}
                    >
                      Edit Subcategory
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete("subcategory", selectedSubcategory)}
                    >
                      Delete Subcategory
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="inventory-toolbar">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
              />

              <button type="button" onClick={handleAdd}>
                <FontAwesomeIcon icon="plus" />
                {getAddLabel()}
              </button>
            </div>

            {view === "categories" && (
              <div className="inventory-card-grid">
                {visibleCategories.length === 0 ? (
                  <div className="inventory-empty-box">
                    No categories found. Click Add Category.
                  </div>
                ) : (
                  visibleCategories.map(category => (
                    <article key={category.id} className="inventory-tile">
                      <button type="button" onClick={() => openCategory(category)}>
                        <div>
                          <h3>{category.name}</h3>
                          <p>{category.description || "No description"}</p>
                          <span>
                            {category.subcategories?.length || 0} subcategories
                          </span>
                        </div>

                        <FontAwesomeIcon icon="chevron-right" />
                      </button>
                    </article>
                  ))
                )}
              </div>
            )}

            {view === "subcategories" && (
              <div className="inventory-card-grid">
                {visibleSubcategories.length === 0 ? (
                  <div className="inventory-empty-box">
                    No subcategories found. Click Add Subcategory.
                  </div>
                ) : (
                  visibleSubcategories.map(subcategory => (
                    <article key={subcategory.id} className="inventory-tile">
                      <button type="button" onClick={() => openSubcategory(subcategory)}>
                        <div>
                          <h3>{subcategory.name}</h3>
                          <p>{subcategory.description || "No description"}</p>
                          <span>{subcategory.assets?.length || 0} assets</span>
                        </div>

                        <FontAwesomeIcon icon="chevron-right" />
                      </button>
                    </article>
                  ))
                )}
              </div>
            )}

            {view === "assets" && (
              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Asset Tag</th>
                      <th>Name</th>
                      <th>Serial / License</th>
                      <th>Status</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleAssets.length === 0 ? (
                      <tr>
                        <td colSpan="6">No assets found.</td>
                      </tr>
                    ) : (
                      visibleAssets.map(asset => (
                        <tr key={asset.id}>
                          <td>{asset.assetTag}</td>

                          <td>
                            <strong>
                              {asset.deviceName ||
                                asset.model ||
                                asset.vendor ||
                                "Unnamed Asset"}
                            </strong>
                            <span>{asset.manufacturer || asset.vendor || ""}</span>
                          </td>

                          <td>{asset.serialNumber || asset.licenseKey || "N/A"}</td>

                          <td>
                            <span
                              className={`inventory-status ${String(asset.status || "")
                                .toLowerCase()
                                .replaceAll(" ", "-")}`}
                            >
                              {asset.status}
                            </span>
                          </td>

                          <td>{asset.assignedToDisplayName || "Unassigned"}</td>

                          <td>
                            <div className="inventory-row-actions">
                              <button
                                type="button"
                                onClick={() => openModal("edit-asset", asset)}
                              >
                                Edit
                              </button>

                              {!asset.assignedUserId ? (
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(asset)}
                                >
                                  Assign
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleReturnAsset(asset)}
                                >
                                  Return
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDecommission(asset)}
                              >
                                Decom
                              </button>

                              <button
                                type="button"
                                className="danger"
                                onClick={() => handleDelete("asset", asset)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>

      {modalOpen && (
        <div className="inventory-modal-backdrop">
          <form className="inventory-modal" onSubmit={handleSubmit}>
            <div className="inventory-modal-header">
              <h2>
                {modalMode === "create-category" && "Create Category"}
                {modalMode === "edit-category" && "Edit Category"}
                {modalMode === "create-subcategory" && "Create Subcategory"}
                {modalMode === "edit-subcategory" && "Edit Subcategory"}
                {modalMode === "create-asset" && "Create Asset"}
                {modalMode === "edit-asset" && "Edit Asset"}
              </h2>

              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            {modalMode.includes("category") &&
              !modalMode.includes("subcategory") && (
                <>
                  <label>
                    Category Name
                    <input
                      value={categoryForm.name}
                      onChange={e =>
                        setCategoryForm(prev => ({
                          ...prev,
                          name: e.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      value={categoryForm.description}
                      onChange={e =>
                        setCategoryForm(prev => ({
                          ...prev,
                          description: e.target.value
                        }))
                      }
                    />
                  </label>
                </>
              )}

            {modalMode.includes("subcategory") && (
              <>
                <label>
                  Subcategory Name
                  <input
                    value={subcategoryForm.name}
                    onChange={e =>
                      setSubcategoryForm(prev => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={subcategoryForm.description}
                    onChange={e =>
                      setSubcategoryForm(prev => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                  />
                </label>
              </>
            )}

            {modalMode.includes("asset") && (
              <>
                <label>
                  Asset Tag
                  <input
                    value={assetForm.assetTag}
                    onChange={e =>
                      setAssetForm(prev => ({
                        ...prev,
                        assetTag: e.target.value
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Name
                  <input
                    value={assetForm.deviceName}
                    onChange={e =>
                      setAssetForm(prev => ({
                        ...prev,
                        deviceName: e.target.value
                      }))
                    }
                  />
                </label>

                {isSoftware ? (
                  <>
                    <label>
                      Vendor
                      <input
                        value={assetForm.vendor}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            vendor: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      License Key
                      <input
                        value={assetForm.licenseKey}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            licenseKey: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      License Type
                      <input
                        value={assetForm.licenseType}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            licenseType: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      Seats
                      <input
                        type="number"
                        value={assetForm.licenseSeats}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            licenseSeats: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      Expiration Date
                      <input
                        type="date"
                        value={assetForm.expirationDate}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            expirationDate: e.target.value
                          }))
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Serial Number
                      <input
                        value={assetForm.serialNumber}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            serialNumber: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      Manufacturer
                      <input
                        value={assetForm.manufacturer}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            manufacturer: e.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      Model
                      <input
                        value={assetForm.model}
                        onChange={e =>
                          setAssetForm(prev => ({
                            ...prev,
                            model: e.target.value
                          }))
                        }
                      />
                    </label>
                  </>
                )}

                <label>
                  Status
                  <select
                    value={assetForm.status}
                    onChange={e => handleAssetStatusChange(e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Repair">In Repair</option>
                    <option value="Lost">Lost</option>
                    <option value="Stolen">Stolen</option>
                    <option value="Decommissioned">Decommissioned</option>
                  </select>
                </label>

                <label>
                  Location
                  <input
                    value={assetForm.location}
                    onChange={e =>
                      setAssetForm(prev => ({
                        ...prev,
                        location: e.target.value
                      }))
                    }
                  />
                </label>

                {modalMode === "create-asset" && assetForm.status === "Assigned" && (
                  <div className="inventory-assign-box">
                    <h3>Assign Asset</h3>
                    <p>Select who this asset is assigned to.</p>

                    <label>
                      Assigned To
                      <div className="inventory-user-search-row">
                        <input
                          value={assetUserSearch}
                          onChange={e => setAssetUserSearch(e.target.value)}
                          placeholder="Search name, username, or email"
                        />

                        <button type="button" onClick={searchAssetUsers}>
                          Search
                        </button>
                      </div>
                    </label>

                    {assetAssignedUser && (
                      <div className="inventory-selected-user">
                        <strong>{assetAssignedUser.DISPLAY_NAME}</strong>
                        <span>
                          {assetAssignedUser.AD_USERNAME}
                          {assetAssignedUser.EMAIL ? ` • ${assetAssignedUser.EMAIL}` : ""}
                        </span>

                        <button
                          type="button"
                          onClick={() => setAssetAssignedUser(null)}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {assetUserResults.length > 0 && (
                      <div className="inventory-user-results">
                        {assetUserResults.map(user => (
                          <button
                            key={user.Id}
                            type="button"
                            className={
                              assetAssignedUser?.Id === user.Id
                                ? "inventory-user-result active"
                                : "inventory-user-result"
                            }
                            onClick={() => setAssetAssignedUser(user)}
                          >
                            <strong>{user.DISPLAY_NAME}</strong>
                            <span>
                              {user.AD_USERNAME}
                              {user.EMAIL ? ` • ${user.EMAIL}` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <label>
                      Assignment Notes
                      <textarea
                        value={assetAssignNotes}
                        onChange={e => setAssetAssignNotes(e.target.value)}
                        placeholder="Optional assignment notes"
                      />
                    </label>
                  </div>
                )}

                <label>
                  Notes
                  <textarea
                    value={assetForm.notes}
                    onChange={e =>
                      setAssetForm(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))
                    }
                  />
                </label>
              </>
            )}

            <div className="inventory-modal-actions">
              <button type="submit">Save</button>
              <button type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {assignModalOpen && (
        <div className="inventory-modal-backdrop">
          <form className="inventory-modal" onSubmit={handleAssignSubmit}>
            <div className="inventory-modal-header">
              <h2>Assign Asset</h2>

              <button type="button" onClick={closeAssignModal}>
                ×
              </button>
            </div>

            <div className="inventory-assign-summary">
              <strong>{assignAsset?.assetTag}</strong>
              <span>
                {assignAsset?.deviceName ||
                  assignAsset?.model ||
                  assignAsset?.vendor ||
                  "Unnamed Asset"}
              </span>
            </div>

            <label>
              Search User
              <div className="inventory-user-search-row">
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search name, username, or email"
                />

                <button type="button" onClick={searchUsers}>
                  Search
                </button>
              </div>
            </label>

            <div className="inventory-user-results">
              {userResults.length === 0 ? (
                <div className="inventory-empty-box">
                  Search for a user to assign this asset.
                </div>
              ) : (
                userResults.map(user => (
                  <button
                    key={user.Id}
                    type="button"
                    className={
                      selectedUser?.Id === user.Id
                        ? "inventory-user-result active"
                        : "inventory-user-result"
                    }
                    onClick={() => setSelectedUser(user)}
                  >
                    <strong>{user.DISPLAY_NAME}</strong>
                    <span>
                      {user.AD_USERNAME}
                      {user.EMAIL ? ` • ${user.EMAIL}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>

            <label>
              Assignment Notes
              <textarea
                value={assignmentNotes}
                onChange={e => setAssignmentNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </label>

            <div className="inventory-modal-actions">
              <button type="submit" disabled={!selectedUser}>
                Assign
              </button>

              <button type="button" onClick={closeAssignModal}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}