import React from 'react';
import TimelineView from './TimelineView';
import KanbanView from './KanbanView';
import CalendarView from './CalendarView';
import ApplicationTable from './ApplicationTable';
import { type ViewType } from './ViewSwitcher';
import { type ApplicationWithMetadata } from '../types/applications';
import { type JobApplication } from '../utils/localStorage';
import { type TableColumn } from '../types/table';

interface CurrentViewRendererProps {
  currentView: ViewType;
  filteredApplications: ApplicationWithMetadata[];
  tableColumns: TableColumn[];
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
}

const CurrentViewRenderer: React.FC<CurrentViewRendererProps> = ({
  currentView,
  filteredApplications,
  tableColumns,
  onEdit,
  onDelete,
}) => {
  switch (currentView) {
    case 'timeline':
      return (
        <TimelineView
          applications={filteredApplications}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
    case 'kanban':
      return (
        <KanbanView
          applications={filteredApplications}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
    case 'calendar':
      return (
        <CalendarView
          applications={filteredApplications}
          onEdit={onEdit}
        />
      );
    case 'table':
    default:
      return (
        <ApplicationTable
          columns={tableColumns}
          data={filteredApplications}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );
  }
};

export default CurrentViewRenderer;
