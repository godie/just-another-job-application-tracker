import React, { useMemo, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobApplication, InterviewEvent } from '../utils/localStorage';
import { parseLocalDate } from '../utils/date';

interface CalendarViewProps {
  applications: JobApplication[];
  onEdit?: (application: JobApplication) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: { application: JobApplication; event: InterviewEvent }[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const formatMonthYear = (date: Date, locale?: string) =>
  date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isToday = (date: Date) => isSameDay(date, new Date());

// Calculate days difference between two dates
const getDaysDifference = (eventDate: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const diffTime = event.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// Format relative time indicator
const formatRelativeTime = (eventDate: Date, t: TranslateFn): string => {
  const daysDiff = getDaysDifference(eventDate);
  
  if (daysDiff === 0) {
    return t('calendar.relative.today');
  } else if (daysDiff === 1) {
    return t('calendar.relative.tomorrow');
  } else if (daysDiff === -1) {
    return t('calendar.relative.yesterday');
  } else if (daysDiff > 1) {
    return t('calendar.relative.inDays', { count: daysDiff });
  } else {
    return t('calendar.relative.daysAgo', { count: Math.abs(daysDiff) });
  }
};

// Memoized to prevent re-renders when filteredApplications reference changes but content is the same
const CalendarView: React.FC<CalendarViewProps> = ({ applications, onEdit }) => {
  const { t, i18n } = useTranslation();
  const [focusMonth, setFocusMonth] = useState(() => startOfMonth(new Date()));

  const calendar = useMemo(() => {
    const start = startOfMonth(focusMonth);

    const startDay = new Date(start);
    startDay.setDate(start.getDate() - start.getDay());

    const days: CalendarDay[] = [];

    for (let i = 0; i < 42; i += 1) {
      const current = new Date(startDay);
      current.setDate(startDay.getDate() + i);

      const eventsForDay: CalendarDay['events'] = [];

      applications.forEach((application) => {
        application.timeline?.forEach((event) => {
          if (!event.date) return;
          const eventDate = parseLocalDate(event.date);
          if (isSameDay(eventDate, current)) {
            eventsForDay.push({ application, event });
          }
        });
      });

      days.push({
        date: current,
        isCurrentMonth: current.getMonth() === focusMonth.getMonth(),
        events: eventsForDay,
      });
    }

    return days;
  }, [applications, focusMonth]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('calendar.title')}</h2>
          <p className="text-sm text-gray-500">{formatMonthYear(focusMonth, i18n.language)}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFocusMonth((prev) => addMonths(prev, -1))}
            className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 transition"
          >
            {t('common.previous')}
          </button>
          <button
            type="button"
            onClick={() => setFocusMonth(startOfMonth(new Date()))}
            className="px-3 py-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
          >
            {t('calendar.today')}
          </button>
          <button
            type="button"
            onClick={() => setFocusMonth((prev) => addMonths(prev, 1))}
            className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 transition"
          >
            {t('common.next')}
          </button>
        </div>
      </header>

      <div className="hidden sm:grid grid-cols-7 bg-gray-100 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-600">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2 text-center">
            {t(`calendar.weekdays.${label}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x">
        {calendar.map((day) => {
          const today = isToday(day.date);
          return (
            <div
              key={day.date.toISOString()}
              className={`min-h-[80px] sm:min-h-[110px] px-2 sm:px-3 py-1.5 sm:py-2 border-gray-200 ${
                today
                  ? 'bg-indigo-50 border-2 border-indigo-400'
                  : day.isCurrentMonth
                  ? 'bg-white'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`text-xs font-semibold ${
                    today
                      ? 'bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center'
                      : 'text-gray-600'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {day.events.length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-600">{day.events.length}</span>
                )}
              </div>
              <ul className="mt-1 space-y-0.5 sm:space-y-1">
                {day.events.slice(0, 3).map(({ application, event }) => {
                  const eventDate = parseLocalDate(event.date);
                  const relativeTime = formatRelativeTime(eventDate, t);
                  const daysDiff = getDaysDifference(eventDate);
                  const isPast = daysDiff < 0;
                  
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => onEdit?.(application)}
                        className={`w-full text-left text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition ${
                          isPast
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        <span className="font-semibold block truncate">{application.position}</span>
                        <span className="block truncate capitalize">
                          {event.type === 'custom' && event.customTypeName
                            ? event.customTypeName
                            : t(`insights.interviewTypes.${event.type}`, event.type.replace(/_/g, ' '))}
                        </span>
                        <span
                          className={`block truncate text-[9px] sm:text-[10px] mt-0.5 ${
                            isPast ? 'text-gray-500' : 'text-indigo-600 font-medium'
                          }`}
                        >
                          {relativeTime}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {day.events.length > 3 && (
                  <li className="text-[10px] sm:text-[11px] text-gray-500">
                    {t('kanban.more', { count: day.events.length - 3 })}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {applications.length === 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          {t('calendar.noApplications')}
        </div>
      )}
    </div>
  );
};

CalendarView.displayName = 'CalendarView';

export default memo(CalendarView);
