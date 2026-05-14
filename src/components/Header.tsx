/**
 * Header Component
 * Top bar with current project selector
 */

import { useMemo } from 'react';
import { useProjectsStore } from '../features/projects/store';
import { useBoqStore } from '../features/boq/store';

interface HeaderProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function Header({ 
  onSearch, 
  showSearch = true,
}: HeaderProps = {}) {
  const projects = useProjectsStore((state) => state.projects);
  const currentProjectId = useProjectsStore((state) => state.currentProjectId);
  const setCurrentProject = useProjectsStore((state) => state.setCurrentProject);
  const items = useBoqStore((state) => state.items);
  
  const currentProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId),
    [projects, currentProjectId]
  );

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = Number(e.target.value);
    if (projectId > 0) {
      setCurrentProject(projectId);
    }
  };

  return (
    <header className="topbar">
      {/* Project Selector */}
      <div className="project-selector">
        <select 
          value={currentProjectId || ''} 
          onChange={handleProjectChange}
          className="project-dropdown"
        >
          <option value="">Select Project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {currentProject && (
          <span className="project-info">
            {items.length} items
            {currentProject.clientPhone && ` • ${currentProject.clientPhone}`}
          </span>
        )}
      </div>

      {/* Global Search */}
      {showSearch && (
        <div className="global-search">
          <span>⌕</span>
          <input 
            type="text" 
            placeholder="Search projects, items, rates..." 
            onChange={(e) => onSearch?.(e.target.value)}
          />
          <span className="global-search-shortcut">⌘K</span>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div className="topbar-actions">
        <button className="icon-btn" title="Refresh">↻</button>
        <button className="icon-btn" title="Help">◔</button>
        <div className="avatar">BO</div>
      </div>
    </header>
  );
}

export default Header;