/**
 * Templates View
 * Uses ERP design system
 */

import { useEffect, useState } from 'react';
import { useTemplatesStore, selectAllTemplates } from '../store';
import { useBoqStore, selectBoqItems } from '../../boq/store';
import { useProjectsStore } from '../../projects/store';
import type { Template, TemplateItem } from '../../../types/domain';
import { logger } from '../../../lib/logger';

export function TemplatesView() {
  const templates = useTemplatesStore(selectAllTemplates);
  const { initialize: initTemplates, addTemplate, deleteTemplate, isInitialized: templatesInitialized } = useTemplatesStore();
  
  const boqItems = useBoqStore(selectBoqItems);
  const currentProjectId = useBoqStore((state) => state.currentProjectId);
  const addBoqItems = useBoqStore((state) => state.addItems);
  
  const currentProject = useProjectsStore((state) => 
    state.projects.find((p) => p.id === currentProjectId)
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('residential');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  useEffect(() => {
    if (!templatesInitialized) {
      initTemplates();
    }
  }, [templatesInitialized, initTemplates]);

  const handleCreateFromBoq = () => {
    if (boqItems.length === 0) {
      alert('No items in current BOQ to save as template');
      return;
    }
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const templateItems: TemplateItem[] = boqItems
      .filter((item) => !item.isSectionHeader)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        category: item.category,
      }));

    try {
      await addTemplate(newTemplateName, newTemplateDescription, newTemplateCategory, templateItems);
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplateCategory('residential');
    } catch (error) {
      logger.error('Failed to save template:', error);
      alert('Failed to save template');
    }
  };

  const handleApplyTemplate = async (template: Template) => {
    if (!currentProjectId) {
      alert('Please select a project first');
      return;
    }

    const boqInputs = template.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      category: item.category,
      isSectionHeader: false,
    }));

    try {
      await addBoqItems(boqInputs);
      alert(`Applied template "${template.name}" - ${template.items.length} items added`);
    } catch (error) {
      logger.error('Failed to apply template:', error);
      alert('Failed to apply template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(id);
    }
  };

  return (
    <div className="panel">
      {/* Panel Header */}
      <div className="panel-head">
        <div className="title-block">
          <h1 className="panel-title">
            BOQ Templates
            <small>({templates.length})</small>
          </h1>
        </div>
        <div className="panel-actions">
          <button 
            className="btn btn-primary"
            onClick={handleCreateFromBoq}
            disabled={!currentProjectId || boqItems.length === 0}
          >
            Save Current BOQ as Template
          </button>
        </div>
      </div>

      {/* Project Info */}
      {currentProject && (
        <div className="alert alert-info mt-4">
          Current Project: <strong>{currentProject.name}</strong> ({boqItems.length} items)
        </div>
      )}

      {!currentProjectId && (
        <div className="alert alert-warning mt-4">
          Select a project from the Projects view to apply templates
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No Templates Yet</div>
          <div className="empty-state-desc">Save your first template from the BOQ Editor to get started</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {templates.map((template) => (
            <div key={template.id} className="panel">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted mt-1">{template.description}</p>
                  )}
                </div>
                <button 
                  className="btn btn-ghost btn-sm text-red-600"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  ✕
                </button>
              </div>
              
              <div className="text-sm text-muted mb-3">
                {template.items.length} items • {template.category}
              </div>
              
              <div className="text-sm text-muted mb-4 space-y-1">
                {template.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="truncate">• {item.description}</div>
                ))}
                {template.items.length > 3 && (
                  <div className="text-xs">+{template.items.length - 3} more items</div>
                )}
              </div>
              
              <button 
                className="btn btn-secondary w-full"
                onClick={() => handleApplyTemplate(template)}
                disabled={!currentProjectId}
              >
                Apply to Current Project
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Save as Template</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-field span-12">
                <label className="form-label">Template Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Standard 5 Marla House"
                />
              </div>
              <div className="form-field span-12">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value)}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-field span-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>
              <div className="alert alert-info mt-4">
                <strong>{boqItems.filter(i => !i.isSectionHeader).length}</strong> items will be saved
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate}>Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatesView;