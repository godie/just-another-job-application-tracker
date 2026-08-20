import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNetworkingStore } from '../../stores/networkingStore';
import type { FollowUpTask } from '../../types/networking';

interface FollowUpListProps {
  now: Date;
}

const isSameLocalDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const partition = (tasks: FollowUpTask[], now: Date) => {
  const overdue: FollowUpTask[] = [];
  const today: FollowUpTask[] = [];
  const upcoming: FollowUpTask[] = [];

  for (const task of tasks) {
    if (task.completedAt) continue;
    const due = new Date(task.dueAt);
    if (Number.isNaN(due.getTime())) continue;
    if (due < startOfDay(now)) overdue.push(task);
    else if (isSameLocalDay(due, now)) today.push(task);
    else upcoming.push(task);
  }

  const compare = (a: FollowUpTask, b: FollowUpTask): number =>
    a.dueAt.localeCompare(b.dueAt);

  overdue.sort(compare);
  today.sort(compare);
  upcoming.sort(compare);
  return { overdue, today, upcoming };
};

const startOfDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const FollowUpRow: React.FC<{ task: FollowUpTask }> = ({ task }) => {
  const { t } = useTranslation();
  const completeFollowUp = useNetworkingStore((s) => s.completeFollowUp);
  const contact = useNetworkingStore((s) =>
    s.contacts.find((c) => c.id === task.contactId),
  );

  return (
    <li className='flex items-center justify-between gap-4 py-2'>
      <div>
        <p className='font-medium text-foreground'>{task.title}</p>
        <p className='text-sm text-muted-foreground'>
          {t('networking.followUps.dueLabel', { date: new Date(task.dueAt).toLocaleString() })}
          {contact?.name ? ` · ${contact.name}` : ''}
        </p>
      </div>
      <Button variant='outline' size='sm' onClick={() => completeFollowUp(task.id)}>
        {t('networking.followUps.complete')}
      </Button>
    </li>
  );
};

export const FollowUpList: React.FC<FollowUpListProps> = ({ now }) => {
  const { t } = useTranslation();
  const followUpTasks = useNetworkingStore((s) => s.followUpTasks);

  const sections = useMemo(() => partition(followUpTasks, now), [followUpTasks, now]);

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4' data-testid='follow-up-sections'>
      {(
        [
          { key: 'due', heading: t('networking.sections.due'), tasks: sections.overdue, testId: 'follow-ups-overdue' },
          { key: 'today', heading: t('networking.sections.today'), tasks: sections.today, testId: 'follow-ups-today' },
          { key: 'upcoming', heading: t('networking.sections.upcoming'), tasks: sections.upcoming, testId: 'follow-ups-upcoming' },
        ] as const
      ).map(({ heading, tasks, testId }) => (
        <Card key={heading} className='p-4'>
          <h2 className='text-lg font-semibold mb-2'>{heading}</h2>
          {tasks.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t('networking.sections.none')}</p>
          ) : (
            <ul data-testid={testId} className='divide-y divide-border'>
              {tasks.map((task) => (
                <FollowUpRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
};

