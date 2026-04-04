'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Settings, User, Plus, Trash2, Edit2, CheckCircle2, Circle, Check, MoreVertical, ChevronDown, ChevronUp, X } from 'lucide-react';

const LONG_BREAK_INTERVAL=4;

export default function Home() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Add a Task!', completed: false, estPomos:1, actPomos:0, isExpanded: false, isEditingName: false },
  ]);
  
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [focusCount, setFocusCount]=useState(0);
  const [activeTaskId, setActiveTaskId]= useState<number | null>(null);

  const [durations, setDurations] = useState({
    focus: 25,
    short: 5,
    long: 15
  });
  
  const [time, setTime] = useState(durations.focus * 60);


  const [editingMinutes, setEditingMinutes] = useState(false);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const [minuteEditVal, setMinuteEditVal] = useState('');

  const [showAddForm, setShowAddForm]=useState(false);
  const [newTaskText, setNewTaskText]= useState('');
  const [newTaskPomos, setNewTaskPomos] = useState<number>(1);

  // finish time calc (short for calculation) (im just using slang)
  const calculateFinishTime = () => {
    const totalRemainingPomos = tasks.reduce((acc, task) =>
      task.completed ? acc : acc + (task.estPomos - task.actPomos),0
    );

    //total mins = (pomos * focus time) + (pomos * short break) + ((pomos/longBreakInterval) * long break)
    //long break logic [unfinished]
    const fullPomos = Math.floor(totalRemainingPomos);
    const fraction = totalRemainingPomos - fullPomos;
    const totalMinutesNeeded = (fullPomos * durations.focus) + (fraction * durations.focus) + (totalRemainingPomos > 0 ? (Math.ceil(totalRemainingPomos) - 1) * durations.short : 0);

    const now = new Date();
    const finishDate=new Date(now.getTime()+totalMinutesNeeded*60000);

    return {
      time: finishDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      hours: (totalMinutesNeeded/60).toFixed(1),
      totalPomos: totalRemainingPomos
    };

  };

  const finishData = calculateFinishTime();

  //browser tab tittle
  useEffect(() => {
    const modeLabel = timerMode === 'focus' ? 'Focus' :timerMode ==='short' ? 'Short Break' : 'Long Break';
    document.title=isActive ? `${formatTime(time)} - ${modeLabel}` : 'pomoflow';
    return () => { document.title = 'pomoflow';};
  }, [time, isActive, timerMode]);


  // the timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && time > 0) {
      interval = setInterval(() => setTime((prev) => prev - 1), 1000);
    } else if (time === 0) {
      setIsActive(false);
      if (interval) clearInterval(interval);
      //audio
      const audio = new Audio('/timer-end.mp3');
      audio.play().catch((error) => console.log("audio play failed :(", error));
    
      // mode switch when timer ends 
      if (timerMode==='focus'){
        const newCount = focusCount +1;
        setFocusCount(newCount);

        //incrememnt actPomos on active task
        if (activeTaskId !==null){
          setTasks(prev => prev.map (t =>
            t.id===activeTaskId ? {...t, actPomos: t.actPomos+1} : t
          ));
        }

        // every LONG_BREAK_INTERVAL focus sessions → long break, else short break
        const nextMode = newCount % LONG_BREAK_INTERVAL === 0 ? 'long' : 'short';
        setTimerMode(nextMode);
        setTime(durations[nextMode] * 60);
      } else {
        // after any break → back to focus, paused
        setTimerMode('focus');
        setTime(durations.focus * 60);

      }    
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, time]);

  //space bar
  useEffect (()=>{
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.code === 'Space'&& tag!== 'INPUT' && tag!=='TEXTAREA'){
        e.preventDefault();
        setIsActive(prev=> !prev);
      }
    };
    window.addEventListener('keydown',handleKey);
    return () => window.removeEventListener('keydown',handleKey);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTaskExpansion = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isExpanded: !t.isExpanded } : t));
  };

  const updatePomos = (id: number, field: 'estPomos' | 'actPomos', val: number) => {
    const rounded=Math.round(val*2)/2;
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: Math.max(0, rounded) } : t));  };
    

  const changeMode = (mode: 'focus' | 'short' | 'long') => {
    setTimerMode(mode);
    setIsActive(false);
    setEditingMinutes(false);
    setTime(durations[mode] * 60);
  };

  const updateTaskText = (id: number, newText: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  // new time
  const startEditingMinutes = () => {
    setIsActive(false);
    setEditingMinutes(true);
    setMinuteEditVal(Math.floor(time/60).toString());
    setTimeout(() => minuteInputRef.current?.select(),50);
  };

  const commitMinuteEdit = () => {
    const newMinutes = parseFloat(minuteEditVal);
    if (!isNaN(newMinutes)&&newMinutes > 0){
      const newDurations = {...durations, [timerMode]: newMinutes};
      setDurations(newDurations);
      setTime(Math.round(newMinutes*60));
    }
    setEditingMinutes(false);
  }

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
    if (activeTaskId===id) setActiveTaskId(null);
  };

const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    setTasks([...tasks, {
      id: Date.now(),
      text: newTaskText.trim(),
      completed: false,
      estPomos: Math.max(0.5, newTaskPomos),
      actPomos: 0,
      isExpanded: false,
      isEditingName: false
    }]);
    setNewTaskText('');
    setNewTaskPomos(1);
    setShowAddForm(false);
  };

  const pomoDots= Array.from({length: LONG_BREAK_INTERVAL}, (_, i) => i < (focusCount % LONG_BREAK_INTERVAL));

  return (
    <main className="min-h-screen bg-[#F2E3BC] flex items-center justify-center p-8 font-balsamiq">
      <div className="w-full max-w-2xl">
        
        {/* NAVBAR */}
        <nav className="w-full bg-[#E8C5BE] rounded-[2rem] px-8 py-4 mb-8 flex items-center justify-between shadow-sm border-b-4 border-[#D4AFA8]">
          <div className="flex items-center gap-2">
            <img src='/logo.png' alt="PomoFlow" className="w-8 h-8 object-contain"/>
            <h1 className="text-3xl font-bold tracking-tight text-[#634832]">PomoFlow</h1>
          </div>
          <div className="flex gap-4 opacity-70 text-[#634832]">
            <div className='relative group'>
              <User className="w-6 h-6 cursor-pointer hover:scale-110 transition" />
              <span className='absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#634832] text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap'>
                Coming soon!
              </span>
            </div>

            <div className='relative group'>
            <Settings className="w-6 h-6 cursor-pointer hover:scale-110 transition" />
              <span className='absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#634832] text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap'>
                Coming soon!
              </span>
            </div>
            
          </div>
        </nav>

        {/* MODE SELECTION */}
        <div className="relative bg-[#D4AFA8] p-1 rounded-2xl mb-8 flex justify-between items-center shadow-inner">
          {['focus', 'short', 'long'].map((mode) => (
            <button
              key={mode}
              onClick={() => changeMode(mode as any)}
              className={`relative z-10 flex-1 py-3 text-lg capitalize transition-colors duration-300 ${
                timerMode === mode ? 'text-[#634832]' : 'text-white/80'
              }`}
            >
              {mode.replace('short', 'Short Break').replace('long', 'Long Break')}
              {timerMode === mode && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#FDF6E3] rounded-xl shadow-md border-b-2 border-white/50 z-[-1]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* TIMER CARD */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#C9948B] rounded-[3rem] p-12 mb-10 shadow-lg border-b-[12px] border-[#A0655C] relative overflow-hidden text-center"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
          
          <div className="relative z-10">

          {/* active task */}
          {activeTaskId!== null && (
            <p className='text-white/50 text-sm font-bold mb-2 tracking-wide truncate'>
              {tasks.find(t=>t.id === activeTaskId)?.text}
            </p>
          )}

            <div className="flex justify-center items-center gap-2 mb-4">
               <span className="text-white/60 tracking-[0.2em] text-xl uppercase font-bold">
                {timerMode === 'short' ? 'Short Break' : timerMode === 'long' ? 'Long Break' : 'Focus'}
              </span>
              <Edit2
                className='w-4 h-4 text-white/50 cursor-pointer hover:text-white transition'
                onClick={startEditingMinutes}
              />
            </div>

            {/*timer edit*/}
            <div className='flex justify-center items-center mb-6 text-8xl md:text-9xl font-bold text-white drop-shadow-xl'>
              {editingMinutes?(
                <input
                ref={minuteInputRef}
                autoFocus
                type="number"
                value={minuteEditVal}
                onChange={(e)=> setMinuteEditVal(e.target.value)}
                onBlur={commitMinuteEdit}
                onKeyDown={(e)=> {if (e.key==='Enter')commitMinuteEdit(); if(e.key==='Escape') setEditingMinutes(false);}}
                className='=w-40 bg-white/20 rounded-2xl text-center outline-none border-b-4 border-white/40 text-8xl md:text-9xl font-bold text-white'
                style={{fontFamily: 'inherit'}}
                />
              ) : (
                <span
                onClick={startEditingMinutes}
                title="Edit minutes"
                className='cursor-text hover:text-white/80 transition'
                >
                  {formatTime(time)}
                </span>
              )}
            </div>


            <button
              onClick={() => {
                const sound = new Audio('/start.mp3');
                sound.play().catch(()=>{});                
                setIsActive(!isActive)}
              }
              className="bg-[#A0655C] hover:bg-[#8B4E48] text-white px-10 py-4 rounded-full text-2xl flex items-center gap-2 mx-auto shadow-xl transition-all active:scale-95 border-b-4 border-[#634832]/30"
              >
                {isActive? <Pause fill="white" /> : <Play fill="white" />}
                {isActive ? 'PAUSE':'START'}
                </button>

                <div className='flex justify-center gap-2 mt-4'>
                  {pomoDots.map((filled, i)=> (
                    <span key={i} className={`w-3 h-3 rounded-full transition-all ${filled ? 'bg-white' : 'bg-white/30'}`} />
                  ))}
                </div>
            </div>
        </motion.div>

        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Tasks</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-[#D4AFA8] p-3 rounded-full shadow-md hover:bg-[#A0655C] transition-all text-white"
            >
              <Plus />
            </button>
          </div>

          {/* ADD TASK inline form (like the expanded edit panel) */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#FDF6E3] rounded-3xl shadow-sm border-b-4 border-[#D4AFA8] overflow-hidden mb-4"
              >
                <div className="px-6 py-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold opacity-60">Task Name</label>
                      <input
                        autoFocus
                        type="text"
                        placeholder="What are you working on?"
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddForm(false); }}
                        className="bg-white rounded-lg p-2 border-b-2 border-[#D4AFA8] outline-none text-lg"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-8">
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-bold opacity-60">Estimated Pomodoros</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={newTaskPomos}
                            onChange={(e) => setNewTaskPomos(parseFloat(e.target.value))}
                            className="w-16 bg-white rounded-lg p-2 text-center border-b-2 border-[#D4AFA8] outline-none"
                          />
                          <div className="flex flex-col">
                            <ChevronUp className="w-4 h-4 cursor-pointer" onClick={() => setNewTaskPomos(p => Math.round((p + 0.5) * 2) / 2)} />
                            <ChevronDown className="w-4 h-4 cursor-pointer" onClick={() => setNewTaskPomos(p => Math.max(0.5, Math.round((p - 0.5) * 2) / 2))} />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 self-end">
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="text-[#A05a5a] p-2 hover:bg-red-100 rounded-xl transition"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <button
                          onClick={handleAddTask}
                          className="bg-[#A0655C] text-white px-6 py-2 rounded-xl transition hover:bg-[#8B4E48]"
                        >
                          Add Task
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <AnimatePresence mode='popLayout'>
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  className={`bg-[#FDF6E3] rounded-3xl shadow-sm border-b-4 overflow-hidden transition-colors ${
                    activeTaskId === task.id ? 'border-[#A0655C] ring-2 ring-[#A0655C]/30' : 'border-[#D4AFA8]'
                  }`}
                >
                  {/* Task Header */}
                  <div
                    className="p-5 flex items-center justify-between cursor-pointer"
                    onClick={() => setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                  >
                    <div className="flex items-center gap-4">
                      <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}>
                        {task.completed ? <CheckCircle2 className="text-[#A0655C]" /> : <Circle />}
                      </button>

                      {/* inline name edit — click the text to edit */}
                      {task.isEditingName ? (
                        <input
                          autoFocus
                          type="text"
                          value={task.text}
                          onChange={(e) => updateTaskText(task.id, e.target.value)}
                          onBlur={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, isEditingName: false } : t))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape')
                              setTasks(tasks.map(t => t.id === task.id ? { ...t, isEditingName: false } : t));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-2xl bg-white rounded-lg px-2 py-0.5 border-b-2 border-[#D4AFA8] outline-none"
                        />
                      ) : (
                        <span
                          className={`text-2xl cursor-text hover:underline decoration-dashed decoration-[#D4AFA8] underline-offset-4 transition ${task.completed ? 'line-through opacity-40' : ''}`}
                          onDoubleClick={(e) => { e.stopPropagation(); setTasks(tasks.map(t => t.id === task.id ? { ...t, isEditingName: true } : t)); }}
                          title="Double-click to edit"
                        >
                          {task.text}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold opacity-40">{task.actPomos} / {task.estPomos}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTaskExpansion(task.id); }}
                        className="p-2 hover:bg-[#E8C5BE] rounded-xl transition"
                      >
                        <MoreVertical className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Task Edit Expansion */}
                  {task.isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="px-6 pb-6 pt-2 bg-[#E8C5BE]/20 border-t-2 border-dashed border-[#D4AFA8]"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-8">
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold opacity-60">Estimated Pomodoros</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={task.estPomos}
                                onChange={(e) => updatePomos(task.id, 'estPomos', parseFloat(e.target.value))}
                                className="w-16 bg-white rounded-lg p-2 text-center border-b-2 border-[#D4AFA8] outline-none"
                              />
                              <div className="flex flex-col">
                                <ChevronUp className="w-4 h-4 cursor-pointer" onClick={() => updatePomos(task.id, 'estPomos', task.estPomos + 0.5)} />
                                <ChevronDown className="w-4 h-4 cursor-pointer" onClick={() => updatePomos(task.id, 'estPomos', task.estPomos - 0.5)} />
                              </div>
                            </div>
                          </div>

                          <div className='flex gap-2 mt-4 self-end'>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className='text-[#A05a5a] p-2 hover:bg-red-100 rounded-xl transition'
                            >
                              <Trash2 className='w-6 h-6' />
                            </button>

                            <button
                              onClick={() => toggleTaskExpansion(task.id)}
                              className='bg-[#A0655C] text-white px-6 py-2 rounded-xl transition hover:bg-[#8B4E48]'
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* --- finish time --- */}
            <div className="bg-[#A0655C] text-white rounded-3xl p-6 flex justify-around items-center shadow-xl border-b-4 border-[#634832]">
              <div className="text-center">
                <p className="text-white/60 text-xs font-bold uppercase">Pomos</p>
                <p className="text-2xl font-bold">{finishData.totalPomos}</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-xs font-bold uppercase">Finish At</p>
                <p className="text-2xl font-bold">{finishData.time} <span className="text-sm opacity-60">({finishData.hours}h)</span></p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </main>
  );
  }