/**
 * Projects view component - list and manage projects
 * Uses new ERP design system classes
 */

import { useState, useCallback } from 'react';
import { useProjectsStore } from '../store';
import { projectCreateSchema } from '../../../lib/validation';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectForm } from '../components/ProjectForm';
import type { Project } from '../../../types/domain';
import { selectAllProjects } from '../store';

interface ProjectsViewProps {
  onProjectSelect: (projectId: number) => void;
}

export function ProjectsView({ onProjectSelect }: ProjectsViewProps) {
  // Use selector function to avoid recreation issues
  const projects = useProjectsStore(selectAllProjects);
  const addProject = useProjectsStore((state) => state.addProject);
  const deleteProject = useProjectsStore((state) => state.deleteProject);
  const updateProject = useProjectsStore((state) => state.updateProject);
  const setCurrentProject = useProjectsStore((state) => state.setCurrentProject);

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProject = useCallback(async (data: { name: string; clientName?: string; clientPhone?: string; projectType?: string; location?: string }) => {
    try {
      const validated = projectCreateSchema.parse(data);
      const newProject: Project = {
        id: Date.now(),
        name: validated.name,
        clientName: validated.clientName || '',
        clientPhone: validated.clientPhone || '',
        projectType: validated.projectType || 'residential',
        location: validated.location || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addProject(newProject);
      setShowForm(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    }
  }, [addProject]);

  const handleEditProject = useCallback(async (id: number, data: { name: string; clientName?: string; clientPhone?: string; projectType?: string; location?: string }) => {
    try {
      updateProject({
        id,
        name: data.name,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        projectType: data.projectType as 'residential' | 'commercial' | 'industrial' | 'infrastructure',
        location: data.location,
      });
      setEditingProject(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }, [updateProject]);

  const handleDeleteProject = useCallback((id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
    }
  }, [deleteProject]);

  const handleSelectProject = useCallback((id: number) => {
    setCurrentProject(id);
    onProjectSelect(id);
  }, [setCurrentProject, onProjectSelect]);

  return (
    <div className="panel">
      {/* Toolbar */}
      <div className="panel-head">
        <div className="title-block">
          <h1 className="panel-title">
            All Projects
            <small>({projects.length})</small>
          </h1>
        </div>
        <div className="panel-actions">
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-error mt-4">
          {error}
        </div>
      )}

      {/* Projects grid */}
      {projects.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">No projects yet</div>
          <div className="empty-state-desc">Create your first project to get started</div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary mt-4"
          >
            + Create Project
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => setEditingProject(project.id)}
                onDelete={() => handleDeleteProject(project.id)}
                onSelect={() => handleSelectProject(project.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <ProjectForm
          title="Create New Project"
          onSubmit={handleCreateProject}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit form modal */}
      {editingProject && (
        <ProjectForm
          title="Edit Project"
          project={projects.find((p: Project) => p.id === editingProject)}
          onSubmit={(data) => handleEditProject(editingProject, data)}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}