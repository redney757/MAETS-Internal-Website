function PayrollHolidaysPanel({ companyDates }) {
  return (
    <section className="landing-panel hr-panel">
      <h2>Payroll & Holidays</h2>

      {companyDates.length > 0 ? (
        <div className="hr-list">
          {companyDates.map((item, index) => (
            <div className="hr-card" key={index}>
              <div className="hr-title">{item.title}</div>
              <div className="hr-body">{item.body}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No payroll or holiday items available.</div>
      )}
    </section>
  );
}

export default PayrollHolidaysPanel;