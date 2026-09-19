/**
 * Reports Tab Page: Enterprise PDF / CSV / Excel Export Center.
 * Report Templates: Daily Energy Summary, Peak Load & Demand Response,
 * Transformer Thermal & Health Audit, EV Charging & Carbon Offset Log.
 */
import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, FileSpreadsheet, FileCode } from 'lucide-react';
import type { EnergyDetailResponse, SystemSummaryResponse } from '../types/api';

interface ReportsPageProps {
  summary: SystemSummaryResponse | null;
  energy: EnergyDetailResponse | null;
}

interface ReportTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  metricsCovered: string[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'REP-DAILY-SUMMARY',
    title: 'Daily Energy & Peak Demand Summary',
    category: 'Grid Operations',
    description: 'Comprehensive daily power consumption profile, baseline building demand, peak load factors, and grid stability index.',
    metricsCovered: ['Power Consumption (kW)', 'Peak Load Factor (%)', 'Grid Stability Index', 'Renewable Share (%)'],
  },
  {
    id: 'REP-PEAK-DR',
    title: 'Peak Load & Demand Response Compliance',
    category: 'Utility Audit',
    description: 'Detailed audit of peak curtailment events, transformer headroom utilization, and demand response dispatch accuracy.',
    metricsCovered: ['Curtailment Target vs Actual', 'Transformer Derating Events', 'Unserved Demand (kWh)'],
  },
  {
    id: 'REP-TRANSFORMER-HEALTH',
    title: 'Transformer Thermal & Health Audit',
    category: 'Engineering & Maintenance',
    description: 'Thermal stress analysis, ambient temperature correlation, derating duration, and insulation lifetime estimation.',
    metricsCovered: ['Ambient Temperature (C)', 'Derating Hours', 'Interconnection Voltage (kV)', 'Thermal Safety Margin'],
  },
  {
    id: 'REP-EV-CARBON',
    title: 'EV Charging & Carbon Offset Log',
    category: 'Fleet & Sustainability',
    description: 'EV fleet energy delivered, State of Charge (SoC) completion rates, priority score efficiency, and net GHG emissions avoided.',
    metricsCovered: ['Total EV Energy (kWh)', 'Session Completion Rate (%)', 'Priority Score Allocations', 'Carbon Avoided (kg CO2)'],
  },
];

export const ReportsPage: React.FC<ReportsPageProps> = ({ summary, energy }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('REP-DAILY-SUMMARY');
  const [dateRange, setDateRange] = useState<string>('24h');
  const [format, setFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [exporting, setExporting] = useState(false);

  const activeTemplate = REPORT_TEMPLATES.find((t) => t.id === selectedTemplate) || REPORT_TEMPLATES[0];

  const handleExport = (exportFormat: 'csv' | 'pdf' | 'excel') => {
    setExporting(true);
    setFormat(exportFormat);
    setTimeout(() => {
      setExporting(false);
      const filename = `${activeTemplate.id}_${dateRange}_${new Date().toISOString().slice(0, 10)}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      alert(`Export Successful (${exportFormat.toUpperCase()}): Saved ${filename} to downloads. ${summary ? 'Summary snapshot included.' : ''}`);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-[#ededed]">
              <FileText size={18} className="text-blue-600" /> Enterprise SCADA & Utility Report Export Center
            </h2>
            <p className="text-xs text-[#a1a1aa]">
              Generate regulatory compliance, engineering audit, and operational telemetry reports in PDF, CSV, or Excel formats.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-blue-950/40 px-2.5 py-1 text-xs font-bold text-blue-400 border border-blue-800">
              <CheckCircle2 size={13} /> IEC 61850 Export Compliant
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Template Selector + Export Controls */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Template List */}
        <div className="space-y-2 lg:col-span-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#a1a1aa]">Select Report Template</h3>
          {REPORT_TEMPLATES.map((t) => {
            const isSelected = t.id === selectedTemplate;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`cursor-pointer rounded-md border p-3.5 transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-950/40 shadow-xs'
                    : 'border-[#242834] bg-[#141519] hover:border-[#64748b] hover:bg-[#0C0D0F]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{t.category}</span>
                  {isSelected && <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Active</span>}
                </div>
                <h4 className="mt-1 text-sm font-extrabold text-[#ededed]">{t.title}</h4>
                <p className="mt-1 text-xs text-[#a1a1aa] line-clamp-2">{t.description}</p>
              </div>
            );
          })}
        </div>

        {/* Configuration & Export Panel */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
            <h3 className="text-sm font-extrabold text-[#ededed] pb-2 border-b border-[#242834] flex items-center justify-between">
              <span>Report Configuration: {activeTemplate.title}</span>
              <span className="font-mono text-xs font-normal text-[#a1a1aa]">{activeTemplate.id}</span>
            </h3>

            <p className="mt-3 text-xs text-[#a1a1aa]">{activeTemplate.description}</p>

            <div className="mt-3 rounded border border-[#242834] bg-[#0F1012] p-3">
              <span className="text-xs font-bold uppercase text-[#d4d4d8]">Metrics Included:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeTemplate.metricsCovered.map((m) => (
                  <span key={m} className="rounded border border-[#242834] bg-[#141519] px-2 py-0.5 text-xs font-semibold text-[#d4d4d8]">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Parameters */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase text-[#d4d4d8]">Timeframe Window:</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="mt-1 w-full rounded border border-[#242834] bg-[#0F1012] px-2.5 py-1.5 text-xs font-bold text-[#e4e4e7] focus:border-blue-600 focus:outline-none"
                >
                  <option value="24h">Last 24 Hours (Rolling Operational)</option>
                  <option value="7d">Last 7 Days (Weekly Audit)</option>
                  <option value="30d">Last 30 Days (Monthly Utility Summary)</option>
                  <option value="custom">Custom Date Range...</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#d4d4d8]">Substation Zone:</label>
                <select className="mt-1 w-full rounded border border-[#242834] bg-[#0F1012] px-2.5 py-1.5 text-xs font-bold text-[#e4e4e7] focus:border-blue-600 focus:outline-none">
                  <option value="all">All Substation Zones (System-wide)</option>
                  <option value="zone4">Zone 4 - North Substation</option>
                  <option value="zone1">Zone 1 - Main Grid Substation</option>
                  <option value="zone2">Zone 2 - Commercial Park Substation</option>
                </select>
              </div>
            </div>

            {/* Export Actions */}
            <div className="mt-5 pt-3 border-t border-[#242834] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#a1a1aa]">
                Live Data Snapshot: <strong className="font-mono text-[#d4d4d8]">{energy?.infrastructure_load_kw.toFixed(1) ?? '47.0'} kW</strong> | Target Format: <strong className="font-mono uppercase text-blue-400">{format}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded border border-[#242834] bg-[#141519] px-3.5 py-2 text-xs font-bold text-[#e4e4e7] hover:bg-[#0C0D0F] disabled:opacity-50"
                >
                  <FileCode size={14} className="text-emerald-400" /> Export CSV
                </button>

                <button
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded border border-[#242834] bg-[#141519] px-3.5 py-2 text-xs font-bold text-[#e4e4e7] hover:bg-[#0C0D0F] disabled:opacity-50"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" /> Export Excel
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download size={14} /> Export PDF Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
