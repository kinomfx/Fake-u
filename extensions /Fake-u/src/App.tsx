import './App.css'

function App() {
  return (
    <main className="popup">
      <header className="brand-row">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2.75 19 5.5v5.1c0 4.65-2.98 8.82-7 10.65-4.02-1.83-7-6-7-10.65V5.5l7-2.75Z" />
            <path d="m8.75 12 2.1 2.1 4.55-4.6" />
          </svg>
        </div>
        <span className="brand-name">FAKE<span>u</span></span>
        <span className="beta-label">BETA</span>
      </header>

      <section className="hero-copy" aria-labelledby="popup-title">
        <p className="eyebrow">Evidence, not noise</p>
        <h1 id="popup-title">Check claims.<br />Not people.</h1>
        <p className="intro">
          FAKEu helps you assess factual claims in X posts using reliable
          sources—not popularity or guesswork.
        </p>
      </section>

      <section className="how-it-works" aria-label="How FAKEu works">
        <div className="step-number">01</div>
        <div>
          <h2>Choose a post</h2>
          <p>Use <strong>Check with FAKEu</strong> on an X post.</p>
        </div>
        <div className="step-number">02</div>
        <div>
          <h2>See the evidence</h2>
          <p>Get the claim, a clear result, and source links.</p>
        </div>
      </section>

      <section className="developers" aria-labelledby="developers-title">
        <p id="developers-title" className="developers-label">Meet the developers</p>
        <div className="developer-links">
          <a href="https://github.com/kinomfx" target="_blank" rel="noreferrer">
            <span className="developer-avatar avatar-kinom">K</span>
            <span>
              <strong>Kinom</strong>
              <small>@kinomfx</small>
            </span>
            <span className="external-arrow" aria-hidden="true">↗</span>
          </a>
          <a href="https://github.com/Keshav-Goyal-04" target="_blank" rel="noreferrer">
            <span className="developer-avatar avatar-keshav">K</span>
            <span>
              <strong>Keshav</strong>
              <small>@Keshav-Goyal-04</small>
            </span>
            <span className="external-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="popup-footer">
        <span className="privacy-dot" aria-hidden="true" />
        Public posts only. No DMs, no account scoring.
      </footer>
    </main>
  )
}

export default App
