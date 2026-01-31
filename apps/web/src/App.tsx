import { useState } from 'react'
import { Home, Clock, Settings, User, Flame, Plus, ChevronRight, Thermometer } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

// Types
interface Cook {
  id: string
  meatCut: string
  weight: number
  smokerType: string
  startTime: Date
  targetTemp: number
  currentTemp: number
  status: 'active' | 'completed' | 'paused'
  estimatedEndTime: Date
  temps: { time: Date; temp: number }[]
}

interface Equipment {
  id: string
  name: string
  type: string
  brand: string
}

// Mock Data
const MEAT_CUTS = [
  { id: 'brisket', name: 'Brisket', targetTemp: 203, timePerPound: 90 },
  { id: 'pork_shoulder', name: 'Pork Shoulder', targetTemp: 205, timePerPound: 90 },
  { id: 'pork_butt', name: 'Pork Butt', targetTemp: 205, timePerPound: 90 },
  { id: 'ribs', name: 'Ribs', targetTemp: 195, timePerPound: 45 },
  { id: 'chicken', name: 'Whole Chicken', targetTemp: 165, timePerPound: 30 },
  { id: 'turkey', name: 'Turkey', targetTemp: 165, timePerPound: 20 },
]

const SMOKER_TYPES = [
  { id: 'offset', name: 'Offset Smoker' },
  { id: 'pellet', name: 'Pellet Grill' },
  { id: 'kamado', name: 'Kamado' },
  { id: 'electric', name: 'Electric Smoker' },
  { id: 'kettle', name: 'Kettle Grill' },
]

// Components
function HomeScreen({
  activeCook,
  onStartCook,
  onLogTemp
}: {
  activeCook: Cook | null
  onStartCook: () => void
  onLogTemp: (temp: number) => void
}) {
  const [tempInput, setTempInput] = useState('')

  if (!activeCook) {
    return (
      <div className="empty-state">
        <Flame size={64} color="#D84315" style={{ marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>No Active Cook</h2>
        <p style={{ marginBottom: '1.5rem' }}>Start a new cook to get AI-powered predictions</p>
        <button className="btn" onClick={onStartCook}>
          <Plus size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Plan a Cook
        </button>
      </div>
    )
  }

  const progress = Math.min(100, (activeCook.currentTemp / activeCook.targetTemp) * 100)
  const timeRemaining = formatDistanceToNow(activeCook.estimatedEndTime, { addSuffix: false })

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="card-title">{activeCook.meatCut}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {activeCook.weight} lbs on {activeCook.smokerType}
            </p>
          </div>
          <span className="badge badge-warning">In Progress</span>
        </div>

        <div className="temp-display">{activeCook.currentTemp}°F</div>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Target: {activeCook.targetTemp}°F
        </p>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.875rem' }}>
          <span>Started {formatDistanceToNow(activeCook.startTime, { addSuffix: true })}</span>
          <span>~{timeRemaining} remaining</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Log Temperature</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            className="input"
            placeholder="Enter temp (°F)"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
          />
          <button
            className="btn"
            style={{ width: 'auto', padding: '0.75rem 1rem' }}
            onClick={() => {
              if (tempInput) {
                onLogTemp(parseInt(tempInput))
                setTempInput('')
              }
            }}
          >
            <Thermometer size={20} />
          </button>
        </div>
      </div>

      {activeCook.temps.length > 0 && (
        <div className="card">
          <h3 className="card-title">Temperature Log</h3>
          {activeCook.temps.slice(-5).reverse().map((t, i) => (
            <div key={i} className="list-item">
              <span>{format(t.time, 'h:mm a')}</span>
              <span style={{ fontWeight: 600 }}>{t.temp}°F</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCookScreen({
  onClose,
  onStartCook
}: {
  onClose: () => void
  onStartCook: (cook: Omit<Cook, 'id' | 'temps'>) => void
}) {
  const [meatCut, setMeatCut] = useState('')
  const [weight, setWeight] = useState('')
  const [smokerType, setSmokerType] = useState('')

  const selectedMeat = MEAT_CUTS.find(m => m.id === meatCut)
  const estimatedTime = selectedMeat && weight
    ? Math.round((selectedMeat.timePerPound * parseFloat(weight)) / 60)
    : 0

  const handleStart = () => {
    if (!meatCut || !weight || !smokerType) return

    const meat = MEAT_CUTS.find(m => m.id === meatCut)!
    const smoker = SMOKER_TYPES.find(s => s.id === smokerType)!
    const now = new Date()
    const estimatedEnd = new Date(now.getTime() + estimatedTime * 60 * 60 * 1000)

    onStartCook({
      meatCut: meat.name,
      weight: parseFloat(weight),
      smokerType: smoker.name,
      startTime: now,
      targetTemp: meat.targetTemp,
      currentTemp: 40,
      status: 'active',
      estimatedEndTime: estimatedEnd,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Plan Your Cook</h2>

        <div className="form-group">
          <label className="label">What are you smoking?</label>
          <select className="select" value={meatCut} onChange={e => setMeatCut(e.target.value)}>
            <option value="">Select meat cut...</option>
            {MEAT_CUTS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Weight (lbs)</label>
          <input
            type="number"
            className="input"
            placeholder="e.g., 12"
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label">Smoker Type</label>
          <select className="select" value={smokerType} onChange={e => setSmokerType(e.target.value)}>
            <option value="">Select smoker...</option>
            {SMOKER_TYPES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {estimatedTime > 0 && (
          <div className="card" style={{ background: 'var(--background)', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Estimated Cook Time</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
              {estimatedTime} hours
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Target temp: {selectedMeat?.targetTemp}°F
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            onClick={handleStart}
            disabled={!meatCut || !weight || !smokerType}
          >
            Start Cook
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryScreen({ cooks }: { cooks: Cook[] }) {
  const completedCooks = cooks.filter(c => c.status === 'completed')

  if (completedCooks.length === 0) {
    return (
      <div className="empty-state">
        <Clock size={64} color="#757575" style={{ marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>No Cook History</h2>
        <p>Your completed cooks will appear here</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Cook History</h2>
      {completedCooks.map(cook => (
        <div key={cook.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">{cook.meatCut}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {cook.weight} lbs • {format(cook.startTime, 'MMM d, yyyy')}
              </p>
            </div>
            <span className="badge badge-success">Completed</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function EquipmentScreen({
  equipment,
  onAdd
}: {
  equipment: Equipment[]
  onAdd: (eq: Omit<Equipment, 'id'>) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [brand, setBrand] = useState('')

  const handleAdd = () => {
    if (name && type) {
      onAdd({ name, type, brand })
      setName('')
      setType('')
      setBrand('')
      setShowAdd(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>My Equipment</h2>
        <button
          className="btn"
          style={{ width: 'auto', padding: '0.5rem 1rem' }}
          onClick={() => setShowAdd(true)}
        >
          <Plus size={20} />
        </button>
      </div>

      {equipment.length === 0 ? (
        <div className="empty-state">
          <Settings size={64} color="#757575" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No Equipment Added</h3>
          <p>Add your smokers and thermometers</p>
        </div>
      ) : (
        equipment.map(eq => (
          <div key={eq.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">{eq.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {eq.brand} • {eq.type}
                </p>
              </div>
              <ChevronRight color="#757575" />
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Equipment</h2>

            <div className="form-group">
              <label className="label">Name</label>
              <input
                className="input"
                placeholder="e.g., My Offset Smoker"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="label">Type</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                <option value="">Select type...</option>
                <option value="Smoker">Smoker</option>
                <option value="Thermometer">Thermometer</option>
                <option value="Accessory">Accessory</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Brand</label>
              <input
                className="input"
                placeholder="e.g., Weber"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn" onClick={handleAdd}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileScreen() {
  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          color: 'white',
          fontSize: '2rem',
          fontWeight: 600
        }}>
          P
        </div>
        <h2>Pitmaster</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Smoking enthusiast</p>
      </div>

      <div className="card">
        <h3 className="card-title">Stats</h3>
        <div className="list-item">
          <span>Total Cooks</span>
          <span style={{ fontWeight: 600 }}>12</span>
        </div>
        <div className="list-item">
          <span>Favorite Cut</span>
          <span style={{ fontWeight: 600 }}>Brisket</span>
        </div>
        <div className="list-item">
          <span>Hours Smoked</span>
          <span style={{ fontWeight: 600 }}>156</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Settings</h3>
        <div className="list-item">
          <span>Temperature Unit</span>
          <span style={{ color: 'var(--text-secondary)' }}>°F</span>
        </div>
        <div className="list-item">
          <span>Notifications</span>
          <span style={{ color: 'var(--text-secondary)' }}>Enabled</span>
        </div>
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [screen, setScreen] = useState<'home' | 'history' | 'equipment' | 'profile'>('home')
  const [showPlanCook, setShowPlanCook] = useState(false)
  const [activeCook, setActiveCook] = useState<Cook | null>(null)
  const [cookHistory, setCookHistory] = useState<Cook[]>([
    {
      id: '1',
      meatCut: 'Brisket',
      weight: 14,
      smokerType: 'Offset Smoker',
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      targetTemp: 203,
      currentTemp: 203,
      status: 'completed',
      estimatedEndTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      temps: [],
    },
    {
      id: '2',
      meatCut: 'Pork Shoulder',
      weight: 10,
      smokerType: 'Pellet Grill',
      startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      targetTemp: 205,
      currentTemp: 205,
      status: 'completed',
      estimatedEndTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      temps: [],
    },
  ])
  const [equipment, setEquipment] = useState<Equipment[]>([
    { id: '1', name: 'Big Green Egg', type: 'Smoker', brand: 'BGE' },
    { id: '2', name: 'Thermapen ONE', type: 'Thermometer', brand: 'ThermoWorks' },
  ])

  const handleStartCook = (cook: Omit<Cook, 'id' | 'temps'>) => {
    setActiveCook({
      ...cook,
      id: Date.now().toString(),
      temps: [],
    })
  }

  const handleLogTemp = (temp: number) => {
    if (activeCook) {
      setActiveCook({
        ...activeCook,
        currentTemp: temp,
        temps: [...activeCook.temps, { time: new Date(), temp }],
      })
    }
  }

  const handleAddEquipment = (eq: Omit<Equipment, 'id'>) => {
    setEquipment([...equipment, { ...eq, id: Date.now().toString() }])
  }

  return (
    <div className="app">
      <header className="header">
        <h1>SmokeRing</h1>
      </header>

      <main className="main">
        {screen === 'home' && (
          <HomeScreen
            activeCook={activeCook}
            onStartCook={() => setShowPlanCook(true)}
            onLogTemp={handleLogTemp}
          />
        )}
        {screen === 'history' && <HistoryScreen cooks={cookHistory} />}
        {screen === 'equipment' && <EquipmentScreen equipment={equipment} onAdd={handleAddEquipment} />}
        {screen === 'profile' && <ProfileScreen />}
      </main>

      <nav className="nav">
        <button className={`nav-item ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
          <Home size={24} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${screen === 'history' ? 'active' : ''}`} onClick={() => setScreen('history')}>
          <Clock size={24} />
          <span>History</span>
        </button>
        <button className={`nav-item ${screen === 'equipment' ? 'active' : ''}`} onClick={() => setScreen('equipment')}>
          <Settings size={24} />
          <span>Equipment</span>
        </button>
        <button className={`nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => setScreen('profile')}>
          <User size={24} />
          <span>Profile</span>
        </button>
      </nav>

      {showPlanCook && (
        <PlanCookScreen
          onClose={() => setShowPlanCook(false)}
          onStartCook={handleStartCook}
        />
      )}
    </div>
  )
}
