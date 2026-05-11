/**
 * Sidebar Component
 * Professional ERP navigation matching erp-ui-design.html
 */

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const navSections = [
  {
    label: 'Core Modules',
    items: [
      { id: 'projects', label: 'Projects', icon: '◈' },
      { id: 'boq', label: 'BOQ', icon: '▤' },
      { id: 'rates', label: 'Rates', icon: '◎' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'templates', label: 'Templates', icon: '◫' },
      { id: 'export', label: 'Export', icon: '▧' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { id: 'settings', label: 'Settings', icon: '⚙' },
    ]
  }
];

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">B</div>
        <div>
          <div className="sidebar-brand-title">BOQ Manager</div>
          <div className="sidebar-brand-sub">Construction ERP</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-row">
          <span>System Health</span>
          <strong>99.9%</strong>
        </div>
        <div className="progress-bar">
          <span className="progress-bar-fill" style={{ width: '92%' }}></span>
        </div>
        <div className="footer-row">
          <span>Version</span>
          <strong>v1.0.0</strong>
        </div>
      </div>
    </aside>
  );
}