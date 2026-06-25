import React, { useMemo, useState, memo } from 'react';
import { getTodayDate, cloneDate } from '../utils/dateHelpers';
import { useTranslation } from 'react-i18next';
import type { JobApplication, InterviewEvent } from '../types/applications';
import type { ApplicationWithMetadata } from '../types/applications';
import { parseLocalDate } from '../utils/date';
import { Button } from './ui/Button';

interface CalendarViewProps {
  applications: ApplicationWithMetadata[];
  onSelectJob?: (application: JobApplication) => void;
  onEdit?: (application: JobApplication) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: { application: ApplicationWithMetadata; event: InterviewEvent }[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const formatMonthYear = (date: Date, locale?: string) =>
  date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();


const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getEventStyles = (status: string, isPast: boolean) => {
  const s = status.toLowerCase();
  const baseClasses = 'w-full text-left text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-1 sm:py-1.5 min-h-[44px] rounded-sm border-l-2 transition';

  const statusStyles: Record<string, { button: string; time: string; borderPast: string }> = {
    applied: {
      button: 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 border-blue-500 dark:border-blue-400',
      time: 'text-blue-600 dark:text-blue-400 font-medium',
      borderPast: 'border-blue-300 dark:border-blue-700',
    },
    interviewing: {
      button: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border-emerald-500 dark:border-emerald-400',
      time: 'text-emerald-600 dark:text-emerald-400 font-medium',
      borderPast: 'border-emerald-300 dark:border-emerald-700',
    },
    rejected: {
      button: 'bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 border-red-500 dark:border-red-400',
      time: 'text-red-600 dark:text-red-400 font-medium',
      borderPast: 'border-red-300 dark:border-red-700',
    },
    hold: {
      button: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 dark:text-yellow-300 border-yellow-500 dark:border-yellow-400',
      time: 'text-yellow-600 dark:text-yellow-400 font-medium',
      borderPast: 'border-yellow-300 dark:border-yellow-700',
    },
    offer: {
      button: 'bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 border-green-500 dark:border-green-400',
      time: 'text-green-600 dark:text-green-400 font-medium',
      borderPast: 'border-green-300 dark:border-green-700',
    },
    withdrawn: {
      button: 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 dark:text-slate-300 border-slate-500 dark:border-slate-400',
      time: 'text-slate-600 dark:text-slate-400 font-medium',
      borderPast: 'border-slate-300 dark:border-slate-700',
    },
    ghosted: {
      button: 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 dark:text-slate-300 border-slate-500 dark:border-slate-400',
      time: 'text-slate-600 dark:text-slate-400 font-medium',
      borderPast: 'border-slate-300 dark:border-slate-700',
    },
  };

  const config = statusStyles[s] || {
    button: 'bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary border-primary dark:border-primary',
    time: 'text-primary dark:text-primary/80 font-medium',
    borderPast: 'border-primary/40 dark:border-primary/60',
  };

  if (isPast) {
    return {
      button: `${baseClasses} bg-muted hover:bg-accent text-muted-foreground ${config.borderPast}`,
      time: 'text-muted-foreground/70',
    };
  }

  return {
    button: `${baseClasses} ${config.button}`,
    time: config.time,
  };
};

const getDaysDifference = (eventDate: Date, referenceDate: Date): number => {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const diffTime = event.getTime() - ref.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const formatRelativeTime = (eventDate: Date, referenceDate: Date, t: TranslateFn): string => {
  const daysDiff = getDaysDifference(eventDate, referenceDate);

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

const CalendarView: React.FC<CalendarViewProps> = ({ applications, onSelectJob }) => {
  const { t, i18n } = useTranslation();
  const [focusMonth, setFocusMonth] = useState(() => startOfMonth(getTodayDate()));
  const [today] = useState(() => getTodayDate());

  const calendar = useMemo(() => {
    const start = startOfMonth(focusMonth);      const startDay = cloneDate(start);
      startDay.setDate(start.getDate() - start.getDay());

    const days: CalendarDay[] = [];

    const eventsByDate = new Map<string, { application: ApplicationWithMetadata; event: InterviewEvent }[]>();

    applications.forEach((application) => {
      application.timeline?.forEach((event) => {
        if (!event.date) return;

        const dateObj = parseLocalDate(event.date);
        const dateKey = formatDateKey(dateObj);

        if (!eventsByDate.has(dateKey)) {
          eventsByDate.set(dateKey, []);
        }
        eventsByDate.get(dateKey)!.push({ application, event });
      });
    });

    for (let i = 0; i < 42; i += 1) {
      const current = cloneDate(startDay);
      current.setDate(startDay.getDate() + i);

      const dateKey = formatDateKey(current);

      days.push({
        date: current,
        isCurrentMonth: current.getMonth() === focusMonth.getMonth(),
        events: eventsByDate.get(dateKey) ?? [],
      });
    }

    return days;
  }, [applications, focusMonth]);

  return (
    <div className='bg-card border border-border rounded overflow-hidden'>
      <header className='flex items-center justify-between px-4 py-3 bg-muted border-b border-border flex-wrap gap-3'>
        <div>
          <h2 className='text-lg font-semibold text-foreground'>{t('calendar.title')}</h2>
          <p className='text-sm text-muted-foreground'>{formatMonthYear(focusMonth, i18n.language)}</p>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setFocusMonth((prev) => addMonths(prev, -1))}
          >
            {t('common.previous')}
          </Button>
          <Button
            type='button'
            variant='primary'
            size='sm'
            onClick={() => setFocusMonth(startOfMonth(getTodayDate()))}
          >
            {t('calendar.today')}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setFocusMonth((prev) => addMonths(prev, 1))}
          >
            {t('common.next')}
          </Button>
        </div>
      </header>

      <div className='grid grid-cols-7 bg-muted border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {WEEKDAY_LABELS.map((label, index) => (
          <div key={label} className='px-1 sm:px-3 py-2 text-center' aria-label={t(`calendar.weekdays.${label}`)}>
            <span className='sm:hidden'>{WEEKDAY_ABBREV[index]}</span>
            <span className='hidden sm:inline'>{t(`calendar.weekdays.${label}`)}</span>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x'>
        {calendar.map((day) => {
          const isToday = isSameDay(day.date, today);
          return (
            <div
              key={day.date.toISOString()}
              className={`min-h-[80px] sm:min-h-[110px] px-2 sm:px-3 py-1.5 sm:py-2 border-border ${
                isToday
                  ? 'bg-primary/10 border-2 border-primary/60'
                  : day.isCurrentMonth
                  ? 'bg-card'
                  : 'bg-muted text-muted-foreground/60'
              }`}
            >
              <div className='flex justify-between items-center'>
                <span
                  className={`text-xs font-semibold ${
                    isToday
                      ? 'bg-primary text-primary-foreground rounded-full size-6 flex items-center justify-center'
                      : 'text-muted-foreground'
                  }`}
                >
                  {day.date.getDate()}
                </span>
                {day.events.length > 0 && (
                  <span className='text-[11px] font-semibold text-primary'>{day.events.length}</span>
                )}
              </div>
              <ul className='mt-1 space-y-0.5 sm:space-y-1'>
                {day.events.slice(0, 3).map(({ application, event }) => {
                  const eventDate = parseLocalDate(event.date);
                  const relativeTime = formatRelativeTime(eventDate, today, t);
                  const daysDiff = getDaysDifference(eventDate, today);
                  const isPast = daysDiff < 0;
                  
                  const styles = getEventStyles(application.status, isPast);

                  return (
                    <li key={event.id}>
                      <button
                        type='button'
                        onClick={() => onSelectJob?.(application)}
                        className={styles.button}
                      >
                        <span className='font-semibold block truncate'>{application.position}</span>
                        <span className='block truncate capitalize'>
                          {event.type === 'custom' && event.customTypeName
                            ? event.customTypeName
                            : t(`insights.interviewTypes.${event.type}`, event.type.replace(/_/g, ' '))}
                        </span>
                        <span className={`block truncate text-[9px] sm:text-[10px] mt-0.5 ${styles.time}`}>
                          {relativeTime}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {day.events.length > 3 && (
                  <li className='text-[10px] sm:text-[11px] text-muted-foreground/70'>
                    {t('kanban.more', { count: day.events.length - 3 })}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {applications.length === 0 && (
        <div className='px-4 py-3 bg-muted border-t border-border text-sm text-muted-foreground'>
          {t('calendar.noApplications')}
        </div>
      )}
    </div>
  );
};

CalendarView.displayName = 'CalendarView';

export default memo(CalendarView);