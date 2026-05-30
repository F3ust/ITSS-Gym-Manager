export default function HelpPage() {
  return (
    <div className="page-container">
      <div className="page-header"><h2>Help & Support</h2></div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section>
          <h3 style={{ margin: '0 0 8px' }}>Getting Started</h3>
          <p className="text-muted">Use the sidebar to navigate between sections. Your role determines which features are available.</p>
        </section>
        <section>
          <h3 style={{ margin: '0 0 8px' }}>Account</h3>
          <p className="text-muted">Contact the gym owner to update your account details or reset your password.</p>
        </section>
        <section>
          <h3 style={{ margin: '0 0 8px' }}>Technical Support</h3>
          <p className="text-muted">Report issues to the system administrator.</p>
        </section>
      </div>
    </div>
  )
}
