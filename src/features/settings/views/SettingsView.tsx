/**
 * Settings view component - manage app settings
 * Matches ERP design system
 */

import { useState, useCallback } from 'react';
import { useSettingsStore } from '../store';

export function SettingsView() {
  const settings = useSettingsStore((state) => state.settings);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const exportOptions = useSettingsStore((state) => state.exportOptions);
  const setExportOptions = useSettingsStore((state) => state.setExportOptions);

  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <div className="panel">
      {/* Page Header */}
      <div className="panel-header">
        <h1 className="panel-title">Settings</h1>
        <p className="panel-subtitle">Configure app preferences and defaults</p>
      </div>

      {/* Company Details */}
      <div className="panel">
        <h2 className="text-lg font-semibold mb-4">Company Details</h2>
        <div className="form-grid">
          <div className="form-field span-12">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ companyName: e.target.value })}
              placeholder="Your Company Name"
              className="form-control"
            />
          </div>
          <div className="form-field span-12">
            <label className="form-label">Address</label>
            <textarea
              value={settings.companyAddress}
              onChange={(e) => setSettings({ companyAddress: e.target.value })}
              placeholder="Company address"
              rows={3}
              className="form-control"
            />
          </div>
          <div className="form-field span-6">
            <label className="form-label">Phone</label>
            <input
              type="text"
              value={settings.companyPhone}
              onChange={(e) => setSettings({ companyPhone: e.target.value })}
              placeholder="+92 42 12345678"
              className="form-control"
            />
          </div>
          <div className="form-field span-6">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={settings.companyEmail}
              onChange={(e) => setSettings({ companyEmail: e.target.value })}
              placeholder="info@company.com"
              className="form-control"
            />
          </div>
        </div>
      </div>

      {/* Default Rates */}
      <div className="panel">
        <h2 className="text-lg font-semibold mb-4">Default Rates</h2>
        <div className="form-grid">
          <div className="form-field span-4">
            <label className="form-label">Tax (%)</label>
            <input
              type="number"
              value={settings.defaultTaxRate}
              onChange={(e) => setSettings({ defaultTaxRate: Number(e.target.value) })}
              min={0}
              max={100}
              className="form-control"
            />
          </div>
          <div className="form-field span-4">
            <label className="form-label">Contingency (%)</label>
            <input
              type="number"
              value={settings.defaultContingencyRate}
              onChange={(e) => setSettings({ defaultContingencyRate: Number(e.target.value) })}
              min={0}
              max={100}
              className="form-control"
            />
          </div>
          <div className="form-field span-4">
            <label className="form-label">Profit Margin (%)</label>
            <input
              type="number"
              value={settings.defaultProfitMarginRate}
              onChange={(e) => setSettings({ defaultProfitMarginRate: Number(e.target.value) })}
              min={0}
              max={100}
              className="form-control"
            />
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="panel">
        <h2 className="text-lg font-semibold mb-4">Export Defaults</h2>
        <div className="form-grid">
          <div className="form-field span-12">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeTax}
                onChange={(e) => setExportOptions({ includeTax: e.target.checked })}
              />
              <span>Include tax in exports</span>
            </label>
          </div>
          <div className="form-field span-12">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeContingency}
                onChange={(e) => setExportOptions({ includeContingency: e.target.checked })}
              />
              <span>Include contingency</span>
            </label>
          </div>
          <div className="form-field span-12">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={exportOptions.includeProfitMargin}
                onChange={(e) => setExportOptions({ includeProfitMargin: e.target.checked })}
              />
              <span>Include profit margin</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="panel-actions">
        <button
          onClick={handleSave}
          className="btn btn-primary"
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* App Info */}
      <div className="panel-footer">
        <p>Construction BOQ Calculator v1.0.0</p>
        <p>Built with React + TypeScript + AG Grid</p>
      </div>
    </div>
  );
}

export default SettingsView;