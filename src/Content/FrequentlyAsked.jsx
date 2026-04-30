import "../Design/FrequentlyAsked.css";
import { useEffect, useMemo, useState } from "react";
import api from "../API/api.js";

function FrequentlyAsked() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [message, setMessage] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mode, setMode] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);

  const [editingFaq, setEditingFaq] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [steps, setSteps] = useState([]);

  useEffect(() => {
    loadFAQs();
    loadUser();
  }, []);

  async function loadFAQs() {
    try {
      const res = await api.get("/api/faq");
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage("Failed to load FAQs.");
    }
  }

  async function loadUser() {
    try {
      const res = await api.get("/api/me");
      setUser(res.data);
    } catch {
      setUser(null);
    }
  }

  const isAdmin = useMemo(() => {
    return user?.groups?.some(group =>
      group.toLowerCase().includes("admin")
    );
  }, [user]);

  const filteredCategories = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return categories;
    }

    return categories
      .map(category => ({
        ...category,
        questions: category.questions.filter(faq =>
          faq.question?.toLowerCase().includes(term) ||
          faq.answer?.toLowerCase().includes(term) ||
          category.categoryName?.toLowerCase().includes(term) ||
          faq.steps?.some(step =>
            step.stepTitle?.toLowerCase().includes(term) ||
            step.stepBody?.toLowerCase().includes(term)
          )
        )
      }))
      .filter(category => category.questions.length > 0);
  }, [categories, search]);

  function resetAdminForm() {
    setMode("");
    setCategoryId("");
    setCategoryName("");
    setCategoryDescription("");
    setEditingCategory(null);
    setEditingFaq(null);
    setQuestion("");
    setAnswer("");
    setSteps([]);
  }

  function closeAdmin() {
    setAdminOpen(false);
    resetAdminForm();
  }

  function getNextStepNumber(currentSteps) {
    return currentSteps.length + 1;
  }

  function addLocalStep() {
    setSteps(prev => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        id: null,
        stepNumber: getNextStepNumber(prev),
        stepTitle: "",
        stepBody: "",
        images: []
      }
    ]);
  }

  function updateLocalStep(index, field, value) {
    setSteps(prev =>
      prev.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  }

  function removeLocalStep(index) {
    setSteps(prev =>
      prev
        .filter((_, i) => i !== index)
        .map((step, i) => ({
          ...step,
          stepNumber: i + 1
        }))
    );
  }
function getFAQImageSrc(img) {
  if (!img) return "";

  if (img.imageUrl?.startsWith("http://") || img.imageUrl?.startsWith("https://")) {
    return img.imageUrl;
  }

  return `${api.defaults.baseURL}/api/faq/step-images/${img.id}/image`;
}
  function addLocalImage(stepIndex) {
    setSteps(prev =>
      prev.map((step, i) => {
        if (i !== stepIndex) return step;

        return {
          ...step,
          images: [
            ...(step.images || []),
            {
              tempId: crypto.randomUUID(),
              id: null,
              imageUrl: "",
              caption: "",
              file: null
            }
          ]
        };
      })
    );
  }

  function updateLocalImage(stepIndex, imageIndex, field, value) {
    setSteps(prev =>
      prev.map((step, i) => {
        if (i !== stepIndex) return step;

        return {
          ...step,
          images: step.images.map((img, j) =>
            j === imageIndex ? { ...img, [field]: value } : img
          )
        };
      })
    );
  }

  function removeLocalImage(stepIndex, imageIndex) {
    setSteps(prev =>
      prev.map((step, i) => {
        if (i !== stepIndex) return step;

        return {
          ...step,
          images: step.images.filter((_, j) => j !== imageIndex)
        };
      })
    );
  }

  function openCreateCategoryWithFaq() {
    resetAdminForm();
    setMode("create-category-faq");
    setAdminOpen(true);
  }

  function openAddFaq() {
    resetAdminForm();
    setMode("add-faq");
    setAdminOpen(true);
  }

  function openEditCategory(category) {
    resetAdminForm();
    setMode("edit-category");
    setEditingCategory(category);
    setCategoryId(String(category.categoryId));
    setCategoryName(category.categoryName || "");
    setCategoryDescription(category.description || "");
    setAdminOpen(true);
  }

  function openEditFaq(faq, category) {
    resetAdminForm();
    setMode("edit-faq");
    setEditingFaq(faq);
    setCategoryId(String(category.categoryId));
    setQuestion(faq.question || "");
    setAnswer(faq.answer || "");
    setSteps(
      (faq.steps || []).map(step => ({
        ...step,
        images: step.images || []
      }))
    );
    setAdminOpen(true);
  }

  async function saveStepImages(stepId, stepImages) {
    for (const img of stepImages || []) {
      const hasUrl = img.imageUrl?.trim();
      const hasFile = img.file;

      if (!hasUrl && !hasFile && !img.id) {
        continue;
      }

      if (img.markedForDelete && img.id) {
        await api.delete(`/api/faq/step-images/${img.id}`, {
          data: { changedBy: user?.username || "SYSTEM" }
        });
        continue;
      }

      const formData = new FormData();
      formData.append("caption", img.caption || "");
      formData.append("changedBy", user?.username || "SYSTEM");
      formData.append("uploadedBy", user?.username || "SYSTEM");

      if (hasUrl) {
        formData.append("imageUrl", img.imageUrl.trim());
      }

      if (hasFile) {
        formData.append("image", img.file);
      }

      if (img.id) {
        await api.put(`/api/faq/step-images/${img.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        await api.post(`/api/faq/steps/${stepId}/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
    }
  }

  async function saveSteps(faqId) {
    for (const step of steps) {
      if (step.markedForDelete && step.id) {
        await api.delete(`/api/faq/steps/${step.id}`, {
          data: { changedBy: user?.username || "SYSTEM" }
        });
        continue;
      }

      if (!step.stepBody?.trim()) {
        continue;
      }

      let savedStepId = step.id;

      if (step.id) {
        await api.put(`/api/faq/steps/${step.id}`, {
          stepNumber: Number(step.stepNumber),
          stepTitle: step.stepTitle?.trim() || null,
          stepBody: step.stepBody.trim(),
          changedBy: user?.username || "SYSTEM"
        });
      } else {
        const res = await api.post(`/api/faq/${faqId}/steps`, {
          stepNumber: Number(step.stepNumber),
          stepTitle: step.stepTitle?.trim() || null,
          stepBody: step.stepBody.trim(),
          changedBy: user?.username || "SYSTEM"
        });

        savedStepId = res.data.id;
      }

      await saveStepImages(savedStepId, step.images || []);
    }
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();

    try {
      if (mode === "create-category-faq") {
        if (!categoryName.trim() || !question.trim()) {
          setMessage("Category name and question are required.");
          return;
        }

        const categoryRes = await api.post("/api/faq/categories", {
          name: categoryName.trim(),
          description: categoryDescription?.trim() || null,
          changedBy: user?.username || "SYSTEM"
        });

        const faqRes = await api.post("/api/faq", {
          categoryId: Number(categoryRes.data.categoryId),
          question: question.trim(),
          answer: answer?.trim() || null,
          createdBy: user?.username || "SYSTEM"
        });

        await saveSteps(faqRes.data.id);
        setMessage("Category and FAQ created.");
      }

      if (mode === "add-faq") {
        if (!categoryId || !question.trim()) {
          setMessage("Category and question are required.");
          return;
        }

        const faqRes = await api.post("/api/faq", {
          categoryId: Number(categoryId),
          question: question.trim(),
          answer: answer?.trim() || null,
          createdBy: user?.username || "SYSTEM"
        });

        await saveSteps(faqRes.data.id);
        setMessage("FAQ created.");
      }

      if (mode === "edit-faq") {
        if (!editingFaq || !categoryId || !question.trim()) {
          setMessage("Category and question are required.");
          return;
        }

        await api.put(`/api/faq/${editingFaq.id}`, {
          categoryId: Number(categoryId),
          question: question.trim(),
          answer: answer?.trim() || null,
          changedBy: user?.username || "SYSTEM"
        });

        await saveSteps(editingFaq.id);
        setMessage("FAQ updated.");
      }

      if (mode === "edit-category") {
        if (!editingCategory || !categoryName.trim()) {
          setMessage("Category name is required.");
          return;
        }

        await api.put(`/api/faq/categories/${editingCategory.categoryId}`, {
          name: categoryName.trim(),
          description: categoryDescription?.trim() || null,
          sortOrder: editingCategory.sortOrder || 0,
          changedBy: user?.username || "SYSTEM"
        });

        setMessage("Category updated.");
      }

      closeAdmin();
      await loadFAQs();
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Save failed.");
    }
  }

  async function deleteFaq(id) {
    try {
      await api.delete(`/api/faq/${id}`, {
        data: { changedBy: user?.username || "SYSTEM" }
      });

      setMessage("FAQ deleted.");
      await loadFAQs();
    } catch (err) {
      console.error(err);
      setMessage("Delete failed.");
    }
  }

  async function deleteCategory(id) {
    try {
      await api.delete(`/api/faq/categories/${id}`, {
        data: { changedBy: user?.username || "SYSTEM" }
      });

      setMessage("Category deleted.");
      await loadFAQs();
    } catch (err) {
      console.error(err);
      setMessage("Category delete failed.");
    }
  }

  return (
    <main className="faq-page">
      <section className="faq-shell">
        <header className="faq-header">
          <div>
            <h1 className="faq-title">Frequently Asked Questions</h1>
            <p className="faq-subtitle">
              Find answers to common questions and support topics.
            </p>
          </div>

          {isAdmin && (
            <button
              className="faq-admin-button"
              onClick={() => {
                resetAdminForm();
                setAdminOpen(true);
              }}
            >
              Manage FAQ
            </button>
          )}
        </header>

        <div className="faq-toolbar">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search FAQs..."
          />
        </div>

        {message && <div className="faq-message">{message}</div>}

        <div className="faq-content">
          {filteredCategories.length === 0 ? (
            <p className="faq-empty">No FAQs found.</p>
          ) : (
            filteredCategories.map(category => (
              <section key={category.categoryId} className="faq-category-section">
                <div className="faq-category-heading">
                  <div>
                    <h2>{category.categoryName}</h2>
                    {category.description && <p>{category.description}</p>}
                  </div>

                  {isAdmin && (
                    <div className="faq-category-admin-actions">
                      <button onClick={() => openEditCategory(category)}>
                        Edit Category
                      </button>
                      <button
                        className="danger"
                        onClick={() => deleteCategory(category.categoryId)}
                      >
                        Delete Category
                      </button>
                    </div>
                  )}
                </div>

                <div className="faq-list">
                  {category.questions.map(faq => (
                    <article key={faq.id} className="faq-item">
                      <button
                        className="faq-question"
                        onClick={() =>
                          setOpenId(prev => (prev === faq.id ? null : faq.id))
                        }
                      >
                        <span>{faq.question}</span>
                        <strong>{openId === faq.id ? "−" : "+"}</strong>
                      </button>

                      {openId === faq.id && (
                        <div className="faq-answer">
                          {faq.answer && <p>{faq.answer}</p>}

                          {faq.steps?.length > 0 && (
                            <div className="faq-step-list">
                              {faq.steps.map(step => (
                                <div key={step.id} className="faq-step-display">
                                  <h4>
                                    Step {step.stepNumber}
                                    {step.stepTitle ? `: ${step.stepTitle}` : ""}
                                  </h4>
                                  <p>{step.stepBody}</p>

                                  {step.images?.length > 0 && (
                                    <div className="faq-image-list">
                                      {step.images.map(img => (
                                        <figure key={img.id} className="faq-image-card">
                                          <button
                                            type="button"
                                            className="faq-image-preview-button"
                                            onClick={() =>
                                              setPreviewImage({
                                                src: getFAQImageSrc(img),
                                                caption: img.caption || img.imageFileName || ""
                                              })
                                            }
                                          >
                                            <img
                                              src={getFAQImageSrc(img)}
                                              alt={img.caption || img.imageFileName || "FAQ step image"}
                                            />
                                          </button>

                                          {img.caption && <figcaption>{img.caption}</figcaption>}
                                        </figure>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {isAdmin && (
                            <div className="faq-admin-row">
                              <button onClick={() => openEditFaq(faq, category)}>
                                Edit FAQ
                              </button>

                              <button
                                className="danger"
                                onClick={() => deleteFaq(faq.id)}
                              >
                                Delete FAQ
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      {adminOpen && (
        <div className="faq-modal-backdrop">
          <div className="faq-modal">
            <div className="faq-modal-header">
              <h2>Manage FAQ</h2>
              <button onClick={closeAdmin}>×</button>
            </div>

            {!mode && (
              <div className="faq-admin-options">
                <button onClick={openCreateCategoryWithFaq}>
                  Create new category with FAQ
                </button>

                <button onClick={openAddFaq}>
                  Add FAQ to existing category
                </button>

                <button onClick={closeAdmin}>
                  Cancel
                </button>
              </div>
            )}

            {mode && (
              <form className="faq-form" onSubmit={handleAdminSubmit}>
                {(mode === "create-category-faq" || mode === "edit-category") && (
                  <>
                    <label>Category Name</label>
                    <input
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      placeholder="Example: Email Support"
                    />

                    <label>Category Description</label>
                    <textarea
                      value={categoryDescription}
                      onChange={e => setCategoryDescription(e.target.value)}
                      placeholder="Optional category description"
                    />
                  </>
                )}

                {(mode === "add-faq" || mode === "edit-faq") && (
                  <>
                    <label>Category</label>
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option
                          key={category.categoryId}
                          value={category.categoryId}
                        >
                          {category.categoryName}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {mode !== "edit-category" && (
                  <>
                    <label>Question</label>
                    <input
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      placeholder="Enter FAQ question"
                    />

                    <label>Answer</label>
                    <textarea
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Enter FAQ answer"
                    />

                    <div className="faq-step-builder-header">
                      <h3>Steps</h3>
                      <button type="button" onClick={addLocalStep}>
                        Add Step
                      </button>
                    </div>

                    {steps.map((step, stepIndex) => (
                      <div key={step.id || step.tempId} className="faq-step-editor">
                        <div className="faq-step-editor-header">
                          <strong>Step {stepIndex + 1}</strong>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => removeLocalStep(stepIndex)}
                          >
                            Remove Step
                          </button>
                        </div>

                        <label>Step Title</label>
                        <input
                          value={step.stepTitle || ""}
                          onChange={e =>
                            updateLocalStep(stepIndex, "stepTitle", e.target.value)
                          }
                          placeholder="Optional step title"
                        />

                        <label>Step Body</label>
                        <textarea
                          value={step.stepBody || ""}
                          onChange={e =>
                            updateLocalStep(stepIndex, "stepBody", e.target.value)
                          }
                          placeholder="Step instructions"
                        />

                        <div className="faq-step-builder-header">
                          <h4>Images</h4>
                          <button
                            type="button"
                            onClick={() => addLocalImage(stepIndex)}
                          >
                            Add Image
                          </button>
                        </div>

                        {step.images?.map((img, imageIndex) => (
                          <div
                            key={img.id || img.tempId}
                            className="faq-image-editor"
                          >
                            <label>Image URL</label>
                            <input
                              value={img.imageUrl || ""}
                              onChange={e =>
                                updateLocalImage(
                                  stepIndex,
                                  imageIndex,
                                  "imageUrl",
                                  e.target.value
                                )
                              }
                              placeholder="Optional image URL"
                            />

                            <label>Upload Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e =>
                                updateLocalImage(
                                  stepIndex,
                                  imageIndex,
                                  "file",
                                  e.target.files?.[0] || null
                                )
                              }
                            />

                            <label>Caption</label>
                            <input
                              value={img.caption || ""}
                              onChange={e =>
                                updateLocalImage(
                                  stepIndex,
                                  imageIndex,
                                  "caption",
                                  e.target.value
                                )
                              }
                              placeholder="Optional caption"
                            />

                            <button
                              type="button"
                              className="danger"
                              onClick={() => removeLocalImage(stepIndex, imageIndex)}
                            >
                              Remove Image
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}

                <div className="faq-modal-actions">
                  <button type="button" onClick={resetAdminForm}>
                    Back
                  </button>

                  <button type="submit">
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {previewImage && (
  <div className="faq-image-preview-backdrop" onClick={() => setPreviewImage(null)}>
    <div className="faq-image-preview-modal" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className="faq-image-preview-close"
        onClick={() => setPreviewImage(null)}
      >
        ×
      </button>

      <img src={previewImage.src} alt={previewImage.caption || "FAQ preview"} />

      {previewImage.caption && (
        <p>{previewImage.caption}</p>
      )}
    </div>
  </div>
)}
    </main>
  );
}

export default FrequentlyAsked;