'use client'

import { useState } from 'react'
import AdministrationsPanel from './AdministrationsPanel'
import CategoriesPanel from './CategoriesPanel'
import EventsPanel from './EventsPanel'
import { Calendar, Tag, CalendarDays } from 'lucide-react'

type Section = 'administrations' | 'categories' | 'events'

const SECTIONS: { id: Section; label: string; Icon: typeof Calendar }[] = [
  { id: 'administrations', label: 'Administrations', Icon: Calendar },
  { id: 'categories', label: 'Categories', Icon: Tag },
  { id: 'events', label: 'Events', Icon: CalendarDays },
]

export default function DocumentSettingsPanel() {
  const [section, setSection] = useState<Section>('administrations')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b dark:border-gray-700 pb-2">
        {SECTIONS.map(({ id, label, Icon }) => {
          const active = section === id
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition ${
                active
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>

      {section === 'administrations' && <AdministrationsPanel />}
      {section === 'categories' && <CategoriesPanel />}
      {section === 'events' && <EventsPanel />}
    </div>
  )
}
