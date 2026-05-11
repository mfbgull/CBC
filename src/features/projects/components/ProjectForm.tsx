/**
 * Project form component for create/edit
 * Uses ERP design system
 */

import { useState } from 'react';
import type { Project, ProjectType } from '../../../types/domain';

interface ProjectFormProps {
  title: string;
  project?: Project;
  onSubmit: (data: { name: string; clientName?: string; clientPhone?: string; projectType?: string; location?: string }) => void;
  onClose: () => void;
}

const projectTypes: { value: ProjectType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

export function ProjectForm({ title, project, onSubmit, onClose }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || '');
  const [clientName, setClientName] = useState(project?.clientName || '');
  const [clientPhone, setClientPhone] = useState(project?.clientPhone || '');
  const [projectType, setProjectType] = useState<ProjectType>(project?.projectType || 'residential');
  const [location, setLocation] = useState(project?.location || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      projectType,
      location: location.trim() || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-field span-12">
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ali Residence"
              className={`form-control ${errors.name ? 'form-control-error' : ''}`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div className="form-grid">
            <div className="form-field span-6">
              <label className="form-label">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Muhammad Ali"
                className="form-control"
              />
            </div>

            <div className="form-field span-6">
              <label className="form-label">Client Phone</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="e.g., +92 300 1234567"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-field span-12">
            <label className="form-label">Project Type</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectType)}
              className="form-control"
            >
              {projectTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field span-12">
            <label className="form-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Lahore, Pakistan"
              className="form-control"
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" className="btn btn-primary">{project ? 'Save Changes' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;