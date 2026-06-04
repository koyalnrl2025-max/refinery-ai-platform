'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DEPARTMENTS } from '@/lib/data';
import { I, ChevDownIcon } from './icons';

export default function DeptSelector() {
  const { dept, setDept } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = DEPARTMENTS.find(d => d.id === dept) ?? DEPARTMENTS[0];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const groups = Array.from(new Set(DEPARTMENTS.map(d => d.group)));

  return (
    <div className="dept-select" ref={ref}>
      <button className="dept-trigger" onClick={() => setOpen(o => !o)}>
        <span className="dot" />
        {current.name}
        <ChevDownIcon />
      </button>
      {open && (
        <div className="dept-menu">
          {groups.map(group => (
            <div key={group}>
              <div className="dept-group-label">{group}</div>
              {DEPARTMENTS.filter(d => d.group === group).map(d => (
                <button
                  key={d.id}
                  className={`dept-opt${dept === d.id ? ' active' : ''}`}
                  onClick={() => { setDept(d.id); setOpen(false); }}
                >
                  <span className="d-ico">
                    {I(d.icon)}
                  </span>
                  <span>
                    {d.name}
                    {d.docs > 0 && <small>{d.docs} docs</small>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
