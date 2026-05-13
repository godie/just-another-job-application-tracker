import { lazy, Suspense } from 'react';
import { type ViewType } from './ViewSwitcher';
import { type ApplicationWithMetadata } from '../types/applications';
import { type JobApplication } from '../types/applications';
import { type TableColumn } from '../types/table';

const TimelineView = lazy(() => import('./TimelineView'));
const KanbanView = lazy(() => import('./KanbanView'));
const CalendarView = lazy(() => import('./CalendarView'));
const ApplicationTable = lazy(() => import('./ApplicationTable'));

interface CurrentViewRendererProps {
  currentView: ViewType;
  filteredApplications: ApplicationWithMetadata[];
  tableColumns: TableColumn[];
  onEdit: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
}

const ViewContent: React.FC<CurrentViewRendererProps> = ({
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

const CurrentViewRenderer: React.FC<CurrentViewRendererProps> = (props) => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-earth-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
      </div>
    }>
      <ViewContent {...props} />
    </Suspense>
  );
};

export default CurrentViewRenderer;
