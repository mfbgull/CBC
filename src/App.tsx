/**
 * Main Application Component
 * Professional ERP Layout matching erp-ui-design.html
 * Database: SQLite via Tauri
 */

import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ProjectsView } from './features/projects/views/ProjectsView';
import { BoqView } from './features/boq/views/BoqView';
import { RatesView } from './features/rates/views/RatesView';
import { TemplatesView } from './features/templates/views/TemplatesView';
import { ExportView } from './features/export/views/ExportView';
import { SettingsView } from './features/settings/views/SettingsView';
import { ToastContainer } from './lib/ui';
import { initDatabase } from './lib/db';
import { useProjectsStore } from './features/projects/store';
import { useBoqStore } from './features/boq/store';
import { useRatesStore } from './features/rates/store';
import { useTemplatesStore } from './features/templates/store';
import { useSettingsStore } from './features/settings/store';

type ViewType = 'projects' | 'boq' | 'rates' | 'templates' | 'export' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('projects');
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Store initialization functions
  const initProjects = useProjectsStore((state) => state.initialize);
  const initRates = useRatesStore((state) => state.initialize);
  const initTemplates = useTemplatesStore((state) => state.initialize);
  const initSettings = useSettingsStore((state) => state.initialize);

  // Current project for BOQ
  const currentProjectId = useProjectsStore((state) => state.currentProjectId);
  const loadBoqForProject = useBoqStore((state) => state.loadForProject);

  // Initialize database and load data on startup
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('Initializing database...');
        await initDatabase();
        console.log('Database initialized, loading data...');
        
        // Initialize all stores
        await Promise.all([
          initProjects(),
          initRates(),
          initTemplates(),
          initSettings(),
        ]);
        
        console.log('All data loaded');
        setIsDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setDbError(error instanceof Error ? error.message : 'Failed to initialize database');
      }
    };

    initApp();
  }, [initProjects, initRates, initTemplates, initSettings]);

  // Load BOQ when project changes
  useEffect(() => {
    if (isDbInitialized && currentProjectId) {
      loadBoqForProject(currentProjectId);
    }
  }, [isDbInitialized, currentProjectId, loadBoqForProject]);

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view as ViewType);
  }, []);

  const handleProjectSelect = useCallback((projectId: number) => {
    const setCurrentProject = useProjectsStore.getState().setCurrentProject;
    setCurrentProject(projectId);
    setCurrentView('boq');
  }, []);

  // handleCreateProject is handled in ProjectsView

  const renderView = () => {
    // Show loading while database initializes
    if (!isDbInitialized) {
      return (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading...</div>
          {dbError && <div className="loading-error">{dbError}</div>}
        </div>
      );
    }

    switch (currentView) {
      case 'projects':
        return (
          <ProjectsView
            onProjectSelect={handleProjectSelect}
          />
        );
      case 'boq':
        return <BoqView />;
      case 'rates':
        return <RatesView />;
      case 'templates':
        return <TemplatesView />;
      case 'export':
        return <ExportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="empty-state">
            <div className="empty-state-icon">◫</div>
            <div className="empty-state-title">Coming Soon</div>
            <div className="empty-state-desc">
              This feature is under development
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      
      <div className="main-content">
        <Header />
        
        <div className="content">
          {renderView()}
        </div>
        
        <ToastContainer />
      </div>
    </div>
  );
}

export default App;