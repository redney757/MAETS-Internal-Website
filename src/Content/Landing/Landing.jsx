import '../../Design/Landing.css';
import QuickAccessPanel from './QuickAccessPanel.jsx';
import CalendarEventsPanel from './CalendarEventsPanel.jsx';
import AnnouncementsPanel from './AnnouncementsPanel.jsx';
import PayrollHolidaysPanel from './PayrollHolidaysPanel.jsx';
import ResourceListPanel from './ResourceListPanel.jsx';
import {
  announcements,
  companyDates,
  internalResources,
  employeeResources
} from './LandingData.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router';
import FrequentlyAsked from '../FrequentlyAsked.jsx';

function Landing() {
  return (
    <div className="content landing-page">
      <div className="landing-shell">
        <header className="landing-header">
          <h1 className="landing-header-title">Home</h1>
          <p className="landing-header-subtitle">
            Company tools, announcements, calendar events, and employee resources.
          </p>
        </header>

        <section className="landing-content">
          <div className="landing-main-grid">
            <div className="landing-left-column">
              <QuickAccessPanel />
              <CalendarEventsPanel />
            </div>

            <aside className="landing-right-column">
              <AnnouncementsPanel announcements={announcements} />
              <PayrollHolidaysPanel companyDates={companyDates} />
            </aside>
          </div>

          <ResourceListPanel
            title="Internal Resources"
            subtitle="Tools hosted on the MAETS internal application server."
            resources={internalResources}
          />

          <ResourceListPanel
            title="Employee Resources"
            subtitle="Public or external employee tools."
            resources={employeeResources}
          />
        </section>
      </div>
      <Link id='frequentAskButton' to={"/frequently-asked"}><FontAwesomeIcon icon="fa-question-circle" /></Link>
    </div>
  );
}

export default Landing;


// import { useEffect, useMemo, useState } from 'react';
// import '../Design/Landing.css';
// import api from '../API/api.js';
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { useAuth } from '../../Context/Context.jsx';

// function ResourceImage({ resource, getResourceImageUrl }) {
  

//   const [imgError, setImgError] = useState(false);


//   const finalImageUrl = getResourceImageUrl(resource.imageUrl);
//   const fallbackText = resource.title?.slice(0, 2).toUpperCase() || 'NA';

//   if (!finalImageUrl || imgError) {
//     return (
//       <div className="resource-image-fallback">
//         {fallbackText}
//       </div>
//     );
//   }

//   return (
//     <img
//       src={finalImageUrl}
//       alt={`${resource.title} logo`}
//       onError={() => setImgError(true)}
//     />
//   );
// }

// function Landing() {
// const { user, ldapConfig } = useAuth();

// const changedBy =
//   user?.username ||
//   "SYSTEM";



//   const today = useMemo(() => new Date(), []);

//   const [currentMonth, setCurrentMonth] = useState(today.getMonth());
//   const [currentYear, setCurrentYear] = useState(today.getFullYear());
//   const [selectedDate, setSelectedDate] = useState(
//     new Date(today.getFullYear(), today.getMonth(), today.getDate())
//   );

//   const [mainResources, setMainResources] = useState([]);
//   const [resourcesLoading, setResourcesLoading] = useState(true);
//   const [resourcesError, setResourcesError] = useState('');

//   const [showResourceModal, setShowResourceModal] = useState(false);
//   const [editingResource, setEditingResource] = useState(null);

//   const [deleteMode, setDeleteMode] = useState(false);
//   const [selectedDeleteIds, setSelectedDeleteIds] = useState([]);

//   const [resourceForm, setResourceForm] = useState({
//     title: '',
//     subtitle: '',
//     url: '',
//     imageUrl: '',
//     imageFile: null
//   });

//   const months = [
//     'January', 'February', 'March', 'April', 'May', 'June',
//     'July', 'August', 'September', 'October', 'November', 'December'
//   ];

//   const announcements = [];
//   const selectedEvents = [];
//   const companyDates = [];

//   const internalResources = [
//     { title: 'PTO Tracker', url: 'https://maetsfas02.maets.net:5560' },
//     { title: 'QA Workbook Tracker', url: 'https://maetsfas02.maets.net:5566' },
//     { title: 'Employee Training Matrix', url: 'https://maetsfas02.maets.net:5562' },
//     { title: 'Travel Tracker', url: 'https://maetsfas02.maets.net:5558' },
//     { title: 'IT Tracker', url: 'https://maetsfas02.maets.net:7778' },
//     { title: 'Tech Services NGW Job Tracker', url: 'https://maetsfas02.maets.net:5556' }
//   ];

//   const employeeResources = [
//     { title: 'Employee Navigator', url: 'https://www.employeenavigator.com/' }
//   ];

//   function getResourceImageUrl(imageUrl) {
//     if (!imageUrl) return null;

//     if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
//       return imageUrl;
//     }

//     return `${api.defaults.baseURL}${imageUrl}`;
//   }

//   async function loadQuickAccessLinks() {
//     try {
//       setResourcesLoading(true);
//       setResourcesError('');

//       const response = await api.get('/api/landing/quick-access');
//       setMainResources(Array.isArray(response.data) ? response.data : []);
//     } catch (err) {
//       console.error('Quick access load error:', err.response?.data || err.message);
//       setResourcesError('Failed to load quick access links.');
//     } finally {
//       setResourcesLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadQuickAccessLinks();
//   }, []);

//   const calendarDays = useMemo(() => {
//     const firstDay = new Date(currentYear, currentMonth, 1).getDay();
//     const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
//     const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

//     const days = [];

//     for (let i = firstDay - 1; i >= 0; i--) {
//       const dayNumber = daysInPrevMonth - i;
//       const dateObj = new Date(currentYear, currentMonth - 1, dayNumber);

//       days.push({
//         day: dayNumber,
//         otherMonth: true,
//         isToday: false,
//         dateObj
//       });
//     }

//     for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
//       const dateObj = new Date(currentYear, currentMonth, dayNum);

//       const isToday =
//         dayNum === today.getDate() &&
//         currentMonth === today.getMonth() &&
//         currentYear === today.getFullYear();

//       days.push({
//         day: dayNum,
//         otherMonth: false,
//         isToday,
//         dateObj
//       });
//     }

//     let nextMonthDay = 1;

//     while (days.length < 42) {
//       const dateObj = new Date(currentYear, currentMonth + 1, nextMonthDay);

//       days.push({
//         day: nextMonthDay,
//         otherMonth: true,
//         isToday: false,
//         dateObj
//       });

//       nextMonthDay++;
//     }

//     return days;
//   }, [currentMonth, currentYear, today]);

//   function handlePrevMonth() {
//     if (currentMonth === 0) {
//       setCurrentMonth(11);
//       setCurrentYear(prev => prev - 1);
//     } else {
//       setCurrentMonth(prev => prev - 1);
//     }
//   }

//   function handleNextMonth() {
//     if (currentMonth === 11) {
//       setCurrentMonth(0);
//       setCurrentYear(prev => prev + 1);
//     } else {
//       setCurrentMonth(prev => prev + 1);
//     }
//   }

//   function handleDayClick(dateObj) {
//     setSelectedDate(dateObj);

//     if (
//       dateObj.getMonth() !== currentMonth ||
//       dateObj.getFullYear() !== currentYear
//     ) {
//       setCurrentMonth(dateObj.getMonth());
//       setCurrentYear(dateObj.getFullYear());
//     }
//   }

//   function isSelected(dateObj) {
//     return (
//       selectedDate.getDate() === dateObj.getDate() &&
//       selectedDate.getMonth() === dateObj.getMonth() &&
//       selectedDate.getFullYear() === dateObj.getFullYear()
//     );
//   }

//   function resetResourceForm() {
//     setEditingResource(null);
//     setResourceForm({
//       title: '',
//       subtitle: '',
//       url: '',
//       imageUrl: '',
//       imageFile: null
//     });
//   }

//   function openAddResourceModal() {
//     resetResourceForm();
//     setShowResourceModal(true);
//   }

//   function openEditResourceModal(resource) {
//     setEditingResource(resource);

//     setResourceForm({
//       title: resource.title || '',
//       subtitle: resource.subtitle || '',
//       url: resource.url || '',
//       imageUrl:
//         resource.imageUrl &&
//         (resource.imageUrl.startsWith('http://') || resource.imageUrl.startsWith('https://'))
//           ? resource.imageUrl
//           : '',
//       imageFile: null
//     });

//     setShowResourceModal(true);
//   }

//   function closeResourceModal() {
//     resetResourceForm();
//     setShowResourceModal(false);
//   }

//   async function handleResourceSubmit(event) {
//     event.preventDefault();

//     if (
//       !resourceForm.title.trim() ||
//       !resourceForm.subtitle.trim() ||
//       !resourceForm.url.trim()
//     ) {
//       alert('Title, subtitle, and URL are required.');
//       return;
//     }

//     try {
//       const formData = new FormData();

//       formData.append('title', resourceForm.title.trim());
//       formData.append('subtitle', resourceForm.subtitle.trim());
//       formData.append('url', resourceForm.url.trim());
//       formData.append("changedBy", changedBy);
//       formData.append("createdBy", changedBy);

//       if (resourceForm.imageUrl.trim()) {
//         formData.append('imageUrl', resourceForm.imageUrl.trim());
//       }

//       if (resourceForm.imageFile) {
//         formData.append('image', resourceForm.imageFile);
//       }

//       if (editingResource) {
//         await api.put(`/api/landing/quick-access/${editingResource.id}`, formData, {
//           headers: {
//             "Content-Type": "multipart/form-data"
//           }
//         });
//       } else {
//         await api.post('/api/landing/quick-access', formData, {
//           headers: {
//             "Content-Type": "multipart/form-data"
//           }
//         });
//       }

//       closeResourceModal();
//       await loadQuickAccessLinks();
//     } catch (err) {
//       console.error('Save quick access error:', err.response?.data || err.message);
//       alert(err.response?.data?.message || 'Failed to save quick access link.');
//     }
//   }

//   function toggleDeleteSelection(resourceId) {
//     setSelectedDeleteIds(prev => {
//       if (prev.includes(resourceId)) {
//         return prev.filter(id => id !== resourceId);
//       }

//       return [...prev, resourceId];
//     });
//   }

//   async function handleDeleteSelected() {
//     if (selectedDeleteIds.length === 0) {
//       alert('Select at least one resource to delete.');
//       return;
//     }

//     const confirmed = window.confirm(
//       `Delete ${selectedDeleteIds.length} quick access link(s)? This cannot be undone.`
//     );

//     if (!confirmed) return;

//     try {
//       await Promise.all(
//         selectedDeleteIds.map(id =>
//           api.delete(`/api/landing/quick-access/${id}`, {
//             data: { changedBy }
//           })
//         )
//       );

//       setSelectedDeleteIds([]);
//       setDeleteMode(false);
//       await loadQuickAccessLinks();
//     } catch (err) {
//       console.error('Delete quick access error:', err.response?.data || err.message);
//       alert(err.response?.data?.message || 'Failed to delete selected links.');
//     }
//   }

//   function cancelDeleteMode() {
//     setDeleteMode(false);
//     setSelectedDeleteIds([]);
//   }

//   return (
//     <div className="content landing-page">
//       <div className="landing-shell">
//         <header className="landing-header">
//           <h1 className="landing-header-title">Home</h1>
//           <p className="landing-header-subtitle">
//             Company tools, announcements, calendar events, and employee resources.
//           </p>
//         </header>

//         <section className="landing-content">
//           <div className="landing-main-grid">
//             <div className="landing-left-column">
//               <section className="landing-panel quick-links-panel">
//                 <div className="panel-heading quick-access-heading">
//                   <div>
//                     <h2>Quick Access</h2>
//                     <p>Frequently used company systems.</p>
//                   </div>

//                   <div className="resource-actions">
//                     {
//                       (user?.groups?.includes(ldapConfig?.SITE_ADMIN_ROLE)) ? (
//                         console.log(ldapConfig?.SITE_ADMIN_ROLE),
//                         <button
//                           type="button"
//                           id="resourceAddButton"
//                           onClick={openAddResourceModal}
//                           title="Add quick access link"
//                         >
//                           <FontAwesomeIcon icon="plus" />
//                         </button>
//                       )
//                       : null
//                     }
                

//                     {!deleteMode ? (


//                       user?.groups?.includes(ldapConfig?.SITE_ADMIN_ROLE) ? (
//                       <button
//                         type="button"
//                         id="resourceDeleteModeButton"
//                         onClick={() => {
//                           setDeleteMode(true);
//                           setSelectedDeleteIds([]);
//                         }}
//                         title="Enter delete mode"
//                       >
//                         <FontAwesomeIcon icon="trash" />
//                       </button>

//                       ):(
//                         null
//                       )

//                     ) : (
//                       <>
//                         <button
//                           type="button"
//                           id="resourceConfirmDeleteButton"
//                           onClick={handleDeleteSelected}
//                           title="Delete selected"
//                         >
//                           Delete
//                         </button>

//                         <button
//                           type="button"
//                           id="resourceCancelDeleteButton"
//                           onClick={cancelDeleteMode}
//                           title="Cancel delete mode"
//                         >
//                           Cancel
//                         </button>
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 {deleteMode && (
//                   <div className="delete-mode-banner">
//                     Select quick access cards to delete.
//                     <span>{selectedDeleteIds.length} selected</span>
//                   </div>
//                 )}

//                 <div className="resource-card-grid">
//                   {resourcesLoading ? (
//                     <div className="empty-state resource-grid-message">
//                       Loading quick access links...
//                     </div>
//                   ) : resourcesError ? (
//                     <div className="empty-state resource-grid-message">
//                       {resourcesError}
//                     </div>
//                   ) : mainResources.length === 0 ? (
//                     <div className="empty-state resource-grid-message">
//                       No quick access links available.
//                     </div>
//                   ) : (
//                     mainResources.map(resource => {
//                       const selectedForDelete = selectedDeleteIds.includes(resource.id);

//                       if (deleteMode) {
//                         return (
//                           <button
//                             type="button"
//                             key={resource.id}
//                             className={[
//                               'resource-card',
//                               'image-resource-card',
//                               'delete-select-card',
//                               selectedForDelete ? 'selected-for-delete' : ''
//                             ].join(' ')}
//                             onClick={() => toggleDeleteSelection(resource.id)}
//                           >
//                             <div className="delete-check">
//                               {selectedForDelete ? (
//                                 <FontAwesomeIcon icon="check" />
//                               ) : (
//                                 <FontAwesomeIcon icon="trash" />
//                               )}
//                             </div>

//                             <div className="resource-image-wrap">
//                               <ResourceImage
//                                 resource={resource}
//                                 getResourceImageUrl={getResourceImageUrl}
//                               />
//                             </div>

//                             <div className="resource-card-body">
//                               <h3>{resource.title}</h3>
//                               <p>{resource.subtitle}</p>
//                             </div>
//                           </button>
//                         );
//                       }

//                       return (
//                         <div key={resource.id} className="resource-card-wrap">
//                           <a
//                             className="resource-card image-resource-card"
//                             href={resource.url}
//                             target="_blank"
//                             rel="noreferrer"
//                           >
//                             <div className="resource-image-wrap">
//                               <ResourceImage
//                                 resource={resource}
//                                 getResourceImageUrl={getResourceImageUrl}
//                               />
//                             </div>

//                             <div className="resource-card-body">
//                               <h3>{resource.title}</h3>
//                               <p>{resource.subtitle}</p>
//                             </div>
//                           </a>
//                           {user?.groups?.includes(ldapConfig?.SITE_ADMIN_ROLE) ? (
//                           <button
//                             type="button"
//                             className="resource-edit-button"
//                             onClick={() => openEditResourceModal(resource)}
//                             title="Edit quick access link"
//                           >
//                             <FontAwesomeIcon icon="edit" />
//                           </button>
//                           ):(

//                             null
//                           )
//                         }

//                         </div>
//                       );
//                     })
//                   )}
//                 </div>
//               </section>

//               <section className="landing-panel calendar-events-panel">
//                 <div className="calendar-panel">
//                   <div className="calendar-header">
//                     <button type="button" onClick={handlePrevMonth}>‹</button>

//                     <div className="month-year">
//                       {months[currentMonth]} {currentYear}
//                     </div>

//                     <button type="button" onClick={handleNextMonth}>›</button>
//                   </div>

//                   <div className="current-date">
//                     Today: {months[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
//                   </div>

//                   <div className="days">
//                     <div>Sun</div>
//                     <div>Mon</div>
//                     <div>Tue</div>
//                     <div>Wed</div>
//                     <div>Thu</div>
//                     <div>Fri</div>
//                     <div>Sat</div>
//                   </div>

//                   <div className="dates">
//                     {calendarDays.map((item, index) => (
//                       <button
//                         type="button"
//                         key={index}
//                         className={[
//                           'calendar-day',
//                           item.otherMonth ? 'other-month' : '',
//                           item.isToday ? 'today' : '',
//                           isSelected(item.dateObj) ? 'selected-day' : ''
//                         ].join(' ').trim()}
//                         onClick={() => handleDayClick(item.dateObj)}
//                       >
//                         {item.day}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="event-panel">
//                   <h2>Events</h2>
//                   <p className="selected-date-text">
//                     {months[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
//                   </p>

//                   {selectedEvents.length > 0 ? (
//                     <div className="event-list">
//                       {selectedEvents.map((event, index) => (
//                         <div className="event-card" key={index}>
//                           <div className="event-title">{event.title}</div>
//                           <div className="event-time">{event.time}</div>
//                         </div>
//                       ))}
//                     </div>
//                   ) : (
//                     <div className="empty-state">No events for this day.</div>
//                   )}
//                 </div>
//               </section>
//             </div>

//             <aside className="landing-right-column">
//               <section className="landing-panel announcements-panel">
//                 <h2>Announcements</h2>

//                 {announcements.length > 0 ? (
//                   <div className="announcement-list">
//                     {announcements.map((announcement, index) => (
//                       <div className="announcement-card" key={index}>
//                         <div className="announcement-title">{announcement.title}</div>
//                         <div className="announcement-body">{announcement.body}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="empty-state">No announcements right now.</div>
//                 )}
//               </section>

//               <section className="landing-panel hr-panel">
//                 <h2>Payroll & Holidays</h2>

//                 {companyDates.length > 0 ? (
//                   <div className="hr-list">
//                     {companyDates.map((item, index) => (
//                       <div className="hr-card" key={index}>
//                         <div className="hr-title">{item.title}</div>
//                         <div className="hr-body">{item.body}</div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="empty-state">No payroll or holiday items available.</div>
//                 )}
//               </section>
//             </aside>
//           </div>

//           <section className="landing-panel resource-list-panel">
//             <div className="panel-heading">
//               <h2>Internal Resources</h2>
//               <p>Tools hosted on the MAETS internal application server.</p>
//             </div>

//             <div className="small-resource-grid">
//               {internalResources.map(resource => (
//                 <a
//                   key={resource.title}
//                   className="small-resource-card"
//                   href={resource.url}
//                   target="_blank"
//                   rel="noreferrer"
//                 >
//                   <span>{resource.title}</span>
//                   <small>Open</small>
//                 </a>
//               ))}
//             </div>
//           </section>

//           <section className="landing-panel resource-list-panel">
//             <div className="panel-heading">
//               <h2>Employee Resources</h2>
//               <p>Public or external employee tools.</p>
//             </div>

//             <div className="small-resource-grid">
//               {employeeResources.map(resource => (
//                 <a
//                   key={resource.title}
//                   className="small-resource-card"
//                   href={resource.url}
//                   target="_blank"
//                   rel="noreferrer"
//                 >
//                   <span>{resource.title}</span>
//                   <small>Open</small>
//                 </a>
//               ))}
//             </div>
//           </section>
//         </section>
//       </div>

//       {showResourceModal && (
//         <div className="resource-modal-backdrop">
//           <form className="resource-modal" onSubmit={handleResourceSubmit}>
//             <div className="resource-modal-header">
//               <h2>{editingResource ? 'Edit Quick Access Link' : 'Add Quick Access Link'}</h2>

//               <button
//                 type="button"
//                 onClick={closeResourceModal}
//               >
//                 <FontAwesomeIcon icon="times" />
//               </button>
//             </div>

//             <label>
//               Title
//               <input
//                 type="text"
//                 value={resourceForm.title}
//                 onChange={(event) =>
//                   setResourceForm(prev => ({ ...prev, title: event.target.value }))
//                 }
//                 required
//               />
//             </label>

//             <label>
//               Subtitle
//               <input
//                 type="text"
//                 value={resourceForm.subtitle}
//                 onChange={(event) =>
//                   setResourceForm(prev => ({ ...prev, subtitle: event.target.value }))
//                 }
//                 required
//               />
//             </label>

//             <label>
//               URL
//               <input
//                 type="url"
//                 value={resourceForm.url}
//                 onChange={(event) =>
//                   setResourceForm(prev => ({ ...prev, url: event.target.value }))
//                 }
//                 required
//               />
//             </label>

//             <label>
//               Image URL optional
//               <input
//                 type="url"
//                 value={resourceForm.imageUrl}
//                 onChange={(event) =>
//                   setResourceForm(prev => ({ ...prev, imageUrl: event.target.value }))
//                 }
//                 placeholder="https://example.com/logo.png"
//               />
//             </label>

//             <label>
//               Upload image optional
//               <input
//                 type="file"
//                 accept="image/*"
//                 onChange={(event) =>
//                   setResourceForm(prev => ({
//                     ...prev,
//                     imageFile: event.target.files?.[0] || null
//                   }))
//                 }
//               />
//             </label>

//             <div className="resource-modal-actions">
//               <button type="submit">
//                 {editingResource ? 'Update Link' : 'Add Link'}
//               </button>

//               <button
//                 type="button"
//                 onClick={closeResourceModal}
//               >
//                 Cancel
//               </button>
//             </div>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// }

// export default Landing;