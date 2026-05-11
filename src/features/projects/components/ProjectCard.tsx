/**
 * Project card component displaying project summary
 * Uses ERP design system
 */

import type { Project } from '../../../types/domain';

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const projectTypeLabels: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  infrastructure: 'Infrastructure',
};

export function ProjectCard({ project, onEdit, onDelete, onSelect }: ProjectCardProps) {
  return (
    <div className="panel">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-ink mb-1">{project.name}</h3>
          {project.clientName && (
            <p className="text-sm text-muted">{project.clientName}</p>
          )}
        </div>
        <span className="badge">
          {projectTypeLabels[project.projectType]}
        </span>
      </div>

      {/* Details */}
      <div className="mb-4">
        {project.clientName && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>👤</span>
            <span>{project.clientName}</span>
          </div>
        )}
        {project.clientPhone && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>📞</span>
            <span>{project.clientPhone}</span>
          </div>
        )}
        {project.location && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>📍</span>
            <span>{project.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted mt-2">
          <span>📅</span>
          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-line">
        <button
          onClick={onSelect}
          className="btn btn-primary"
        >
          Open
        </button>
        <button
          onClick={onEdit}
          className="btn btn-ghost"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="btn btn-ghost text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;