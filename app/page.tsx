"use client";

import { useState } from "react";
import {
  ArrowDownRight, ArrowRight, Bell, ChevronDown, CircleHelp, Compass,
  FileText, Home, Layers3, MapPin, Menu, Plus, Ruler, ShieldCheck,
  Sparkles, Trees, Wallet, X, Check, Clock3, MoveUpRight
} from "lucide-react";

const projects = [
  { name: "Green Meadows Plot", location: "Gudivada, Andhra Pradesh", area: "2,400 sq ft", status: "Plot measured", progress: 32, tone: "mint", mark: "GM" },
  { name: "Family Home", location: "Vijayawada, Andhra Pradesh", area: "1,800 sq ft", status: "Design in progress", progress: 58, tone: "sand", mark: "FH" },
];

const features = [
  { icon: Ruler, title: "Measure your land", detail: "Draw boundaries and get area, perimeter and side lengths.", tint: "sage" },
  { icon: Home, title: "Design your home", detail: "Start with editable 2D floor plans, then explore 3D.", tint: "peach" },
  { icon: Wallet, title: "Plan your budget", detail: "Build a cost estimate from materials and local rates.", tint: "blue" },
  { icon: ShieldCheck, title: "Build with confidence", detail: "Keep documents, milestones and contractor details together.", tint: "lilac" },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [toast, setToast] = useState("");

  function createProject() {
    if (!projectName.trim()) {
      setToast("Enter a name for your new project.");
      return;
    }
    setToast(`“${projectName.trim()}” is ready to set up. Plot editing is the next build step.`);
    setProjectName("");
    setShowCreate(false);
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" aria-label="BhoomiSetu home">
          <span className="brand-symbol"><Trees size={23} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>BhoomiSetu</strong><small>LAND TO HOME</small></span>
          <button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">T</span>
          <span className="workspace-label"><strong>My workspace</strong><small>Personal account</small></span>
          <ChevronDown size={16} className="muted-icon" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="nav-list">
          <a className="nav-item active" href="#overview"><Layers3 size={18} /> Overview</a>
          <a className="nav-item" href="#projects"><MapPin size={18} /> My plots <span className="nav-count">02</span></a>
          <a className="nav-item" href="#design"><Home size={18} /> House designs <span className="soon-dot" /></a>
          <a className="nav-item" href="#budget"><Wallet size={18} /> Budget planner</a>
          <a className="nav-item" href="#documents"><FileText size={18} /> Documents</a>
        </nav>
        <p className="nav-label nav-label-spaced">TOOLS</p>
        <nav className="nav-list">
          <a className="nav-item" href="#measure"><Compass size={18} /> Land measurement</a>
          <a className="nav-item" href="#services"><ShieldCheck size={18} /> Trusted services</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><CircleHelp size={18} /></span>
            <strong>Need a hand?</strong>
            <p>We’ll help you plan one step at a time.</p>
            <a href="mailto:hello@bhoomisetu.example">Get support <ArrowRight size={14} /></a>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">TD</span>
            <span className="profile-copy"><strong>Tejesh Dimmiti</strong><small>Project owner</small></span>
            <button className="icon-button" aria-label="Profile options"><ChevronDown size={17} /></button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <section className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="save-status demo-status"><span /> Demo data · not saved</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <div className="top-avatar">TD</div>
          </div>
        </header>

        <div className="page-content" id="overview">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR LAND. YOUR FUTURE.</div>
              <h1>Let’s build something<br /><em>that feels like home.</em></h1>
              <p className="welcome-description">Every great home begins with a piece of land. Let’s make your next step a little simpler.</p>
              <div className="welcome-actions">
                <button className="button-primary" onClick={() => setShowCreate(true)}><Plus size={18} /> Start a project</button>
                <a className="button-secondary" href="#projects">Explore workspace <ArrowRight size={17} /></a>
              </div>
            </div>
            <div className="hero-art" aria-label="Illustration of a home and landscape">
              <div className="sun" />
              <div className="hero-cloud cloud-one" />
              <div className="hero-cloud cloud-two" />
              <div className="hill hill-back" />
              <div className="hill hill-front" />
              <div className="hero-house">
                <div className="roof" />
                <div className="house-body"><div className="window window-one" /><div className="window window-two" /><div className="door" /></div>
              </div>
              <div className="plant plant-one"><i /><i /><i /></div>
              <div className="plant plant-two"><i /><i /><i /></div>
              <span className="hero-note"><Sparkles size={14} /> A plan for every possibility</span>
            </div>
          </section>

          <section className="stats-grid" aria-label="Workspace summary">
            <article className="stat-card"><span className="stat-icon sage"><MapPin size={19} /></span><span className="stat-label">My plots</span><strong>02</strong><small><span className="stat-trend"><ArrowDownRight size={13} /></span> Demo metric</small></article>
            <article className="stat-card"><span className="stat-icon peach"><Home size={19} /></span><span className="stat-label">House designs</span><strong>01</strong><small>Demo metric</small></article>
            <article className="stat-card"><span className="stat-icon blue"><Wallet size={19} /></span><span className="stat-label">Budget planned</span><strong>—</strong><small>Not connected yet</small></article>
            <article className="stat-card"><span className="stat-icon lilac"><ShieldCheck size={19} /></span><span className="stat-label">Next milestone</span><strong className="stat-date">Plot setup</strong><small><Clock3 size={13} /> Demo status</small></article>
          </section>

          <section className="projects-section" id="projects">
            <div className="section-heading">
              <div><span className="section-kicker">YOUR WORKSPACE</span><h2>Pick up where you left off</h2><p>All your land and home plans, in one calm place.</p></div>
              <button className="text-link" onClick={() => setShowCreate(true)}>New project <Plus size={16} /></button>
            </div>
            <div className="project-grid">
              {projects.map((project) => (
                <article className="project-card" key={project.name}>
                  <div className={`project-cover ${project.tone}`}>
                    <div className="cover-top"><span className="project-mark">{project.mark}</span><button className="cover-more" aria-label={`More options for ${project.name}`}>···</button></div>
                    <div className="plot-illustration"><div className="plot-outline"><div className="plot-inner"><span className="plot-pin"><MapPin size={16} /></span><span className="plot-label">YOUR PLOT</span><span className="plot-dimensions">40 ft <i /> 60 ft</span></div></div><span className="plot-compass">N <ArrowRight size={12} /></span></div>
                    <span className="cover-coordinate"><MapPin size={12} /> {project.location}</span>
                  </div>
                  <div className="project-details">
                    <div className="project-title-row"><h3>{project.name}</h3><span className="project-menu-dot">•••</span></div>
                    <div className="project-meta"><span><Ruler size={14} /> {project.area}</span><span className="project-status"><span /> {project.status}</span></div>
                    <div className="progress-label"><span>Project progress</span><strong>{project.progress}%</strong></div>
                    <div className="progress-track"><span style={{ width: `${project.progress}%` }} /></div>
                    <button className="project-open" onClick={() => setToast(`${project.name}: project detail and editor are planned for the next phase.`)}>Open project <ArrowRight size={15} /></button>
                  </div>
                </article>
              ))}
              <button className="new-project-card" onClick={() => setShowCreate(true)}><span className="new-project-icon"><Plus size={23} /></span><strong>A new beginning</strong><span>Start planning your land or home</span><span className="new-project-action">Create a project <ArrowRight size={15} /></span></button>
            </div>
          </section>

          <section className="features-section" id="measure">
            <div className="section-heading compact-heading"><div><span className="section-kicker">A LITTLE HELP, AT EVERY STEP</span><h2>From the ground up</h2></div><span className="feature-caption"><Sparkles size={15} /> Built around your journey</span></div>
            <div className="feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return <article className="feature-card" key={feature.title}><span className={`feature-icon ${feature.tint}`}><Icon size={20} /></span><h3>{feature.title}</h3><p>{feature.detail}</p><a href="#projects" aria-label={`Explore ${feature.title}`}><MoveUpRight size={17} /></a></article>;
              })}
            </div>
          </section>

          <section className="bottom-banner" id="documents"><div className="banner-sparkle"><Sparkles size={22} /></div><div><h2>Big plans start with one small step.</h2><p>Start by mapping your land. We’ll take it from there, one decision at a time.</p></div><button className="banner-button" onClick={() => setShowCreate(true)}>Let’s get started <ArrowRight size={16} /></button></section>
          <footer className="footer"><span>© 2026 BhoomiSetu · Made for the journey home.</span><span><ShieldCheck size={13} /> Your plans deserve care.</span></footer>
        </div>
      </section>

      {showCreate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-button" onClick={() => setShowCreate(false)} aria-label="Close dialog"><X size={19} /></button><span className="modal-icon"><Trees size={23} /></span><span className="section-kicker">A FRESH START</span><h2 id="modal-title">Name your new project</h2><p>Give your plot or home plan a name. You can add the details next.</p><label htmlFor="project-name">Project name</label><input id="project-name" autoFocus placeholder="e.g. Our family home" value={projectName} onChange={(event) => setProjectName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createProject(); }} /><div className="modal-note"><Check size={15} /> You can edit these details later.</div><div className="modal-actions"><button className="button-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="button-primary" onClick={createProject}>Continue <ArrowRight size={16} /></button></div></section></div>}

      {toast && <div className="toast-message" role="status"><Check size={16} /> {toast}<button onClick={() => setToast("")} aria-label="Dismiss message"><X size={15} /></button></div>}
    </main>
  );
}
