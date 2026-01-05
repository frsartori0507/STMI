
import React, { useState, useMemo } from 'react';
import { User, AgendaItem } from '../types';

interface AgendaCalendarProps {
  currentUser: User;
  users: User[];
  agenda: AgendaItem[];
  onSaveItem: (item: AgendaItem) => void;
  onDeleteItem: (id: string) => void;
}

const AgendaCalendar: React.FC<AgendaCalendarProps> = ({ currentUser, users, agenda, onSaveItem, onDeleteItem }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<AgendaItem['type']>('REUNIAO');
  const [filterUserId, setFilterUserId] = useState<string>(currentUser.id);

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const filteredAgenda = useMemo(() => {
    return agenda.filter(item => 
      item.userId === filterUserId &&
      item.date.getMonth() === month &&
      item.date.getFullYear() === year
    );
  }, [agenda, filterUserId, month, year]);

  const handleAddClick = (day: number) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedDay || !newItemTitle.trim()) return;
    const item: AgendaItem = {
      id: Date.now().toString(),
      userId: filterUserId,
      title: newItemTitle,
      description: '',
      date: new Date(year, month, selectedDay),
      type: newItemType
    };
    onSaveItem(item);
    setIsModalOpen(false);
    setNewItemTitle('');
  };

  const renderDays = () => {
    const totalDays = daysInMonth(month, year);
    const offset = firstDayOfMonth(month, year);
    const cells = [];

    // Empty cells
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 sm:h-32 border-b border-r border-slate-100 bg-slate-50/30"></div>);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      const dayItems = filteredAgenda.filter(item => item.date.getDate() === d);
      const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;

      cells.push(
        <div 
          key={d} 
          onClick={() => handleAddClick(d)}
          className={`h-24 sm:h-32 border-b border-r border-slate-100 p-2 cursor-pointer hover:bg-blue-50/30 transition-all flex flex-col group ${isToday ? 'bg-blue-50/20' : 'bg-white'}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-[10px] font-black ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-lg flex items-center justify-center' : 'text-slate-400'}`}>{d}</span>
            <button className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-all">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
            {dayItems.map(item => (
              <div 
                key={item.id} 
                className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold truncate border ${
                  item.type === 'REUNIAO' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                  item.type === 'VISITA' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  item.type === 'ENTREGA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  'bg-slate-50 text-slate-700 border-slate-100'
                }`}
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <h2 className="text-xl font-black text-slate-800 capitalize tracking-tight">
            {monthName} <span className="text-slate-300 ml-1">{year}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ver Agenda de:</span>
          <select 
            value={filterUserId} 
            onChange={(e) => setFilterUserId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {renderDays()}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
               </div>
               Novo Agendamento
            </h3>
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Evento</label>
                 <input 
                   autoFocus
                   value={newItemTitle} 
                   onChange={(e) => setNewItemTitle(e.target.value)}
                   className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                   placeholder="Ex: Reunião de Alinhamento"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                 <div className="grid grid-cols-2 gap-2">
                    {(['REUNIAO', 'VISITA', 'ENTREGA', 'OUTRO'] as const).map(type => (
                      <button 
                        key={type}
                        onClick={() => setNewItemType(type)}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${newItemType === type ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {type}
                      </button>
                    ))}
                 </div>
               </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">Salvar Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaCalendar;
