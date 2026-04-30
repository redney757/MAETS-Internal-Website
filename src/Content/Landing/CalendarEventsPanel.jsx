import { useMemo, useState } from 'react';

function CalendarEventsPanel() {
  const today = useMemo(() => new Date(), []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const selectedEvents = [];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const dayNumber = daysInPrevMonth - i;
      const dateObj = new Date(currentYear, currentMonth - 1, dayNumber);

      days.push({
        day: dayNumber,
        otherMonth: true,
        isToday: false,
        dateObj
      });
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateObj = new Date(currentYear, currentMonth, dayNum);

      const isToday =
        dayNum === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

      days.push({
        day: dayNum,
        otherMonth: false,
        isToday,
        dateObj
      });
    }

    let nextMonthDay = 1;

    while (days.length < 42) {
      const dateObj = new Date(currentYear, currentMonth + 1, nextMonthDay);

      days.push({
        day: nextMonthDay,
        otherMonth: true,
        isToday: false,
        dateObj
      });

      nextMonthDay++;
    }

    return days;
  }, [currentMonth, currentYear, today]);

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  }

  function handleDayClick(dateObj) {
    setSelectedDate(dateObj);

    if (
      dateObj.getMonth() !== currentMonth ||
      dateObj.getFullYear() !== currentYear
    ) {
      setCurrentMonth(dateObj.getMonth());
      setCurrentYear(dateObj.getFullYear());
    }
  }

  function isSelected(dateObj) {
    return (
      selectedDate.getDate() === dateObj.getDate() &&
      selectedDate.getMonth() === dateObj.getMonth() &&
      selectedDate.getFullYear() === dateObj.getFullYear()
    );
  }

  return (
    <section className="landing-panel calendar-events-panel">
      <div className="calendar-panel">
        <div className="calendar-header">
          <button type="button" onClick={handlePrevMonth}>‹</button>

          <div className="month-year">
            {months[currentMonth]} {currentYear}
          </div>

          <button type="button" onClick={handleNextMonth}>›</button>
        </div>

        <div className="current-date">
          Today: {months[today.getMonth()]} {today.getDate()}, {today.getFullYear()}
        </div>

        <div className="days">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="dates">
          {calendarDays.map((item, index) => (
            <button
              type="button"
              key={index}
              className={[
                'calendar-day',
                item.otherMonth ? 'other-month' : '',
                item.isToday ? 'today' : '',
                isSelected(item.dateObj) ? 'selected-day' : ''
              ].join(' ').trim()}
              onClick={() => handleDayClick(item.dateObj)}
            >
              {item.day}
            </button>
          ))}
        </div>
      </div>

      <div className="event-panel">
        <h2>Events</h2>

        <p className="selected-date-text">
          {months[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
        </p>

        {selectedEvents.length > 0 ? (
          <div className="event-list">
            {selectedEvents.map((event, index) => (
              <div className="event-card" key={index}>
                <div className="event-title">{event.title}</div>
                <div className="event-time">{event.time}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No events for this day.</div>
        )}
      </div>
    </section>
  );
}

export default CalendarEventsPanel;