export interface SkillCategory {
  emoji: string;
  name: string;
  skills: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    emoji: '🤿',
    name: 'Diving & Subsea',
    skills: ['Saturation Diving', 'Surface Supplied Diving', 'SCUBA Diving', 'ROV Operation', 'ROV Piloting', 'Subsea Inspection', 'Underwater Welding', 'Hyperbaric Rescue', 'Dive Supervision', 'Life Support Technician'],
  },
  {
    emoji: '🔥',
    name: 'Welding & Fabrication',
    skills: ['MIG/MAG Welding', 'TIG Welding', 'Stick Welding (SMAW)', 'Flux Core Welding', 'Underwater Welding', 'Pipe Welding', 'Structural Welding', 'Weld Inspection', 'Cutting & Grinding', 'Metal Fabrication'],
  },
  {
    emoji: '🔍',
    name: 'Inspection & NDT',
    skills: ['Visual Inspection (VT)', 'Ultrasonic Testing (UT)', 'Magnetic Particle Testing (MT)', 'Dye Penetrant Testing (PT)', 'Radiographic Testing (RT)', 'ACFM Inspection', 'Rope Access Inspection', 'Corrosion Inspection', 'Structural Inspection', 'Pipeline Inspection'],
  },
  {
    emoji: '🏗️',
    name: 'Rigging & Lifting',
    skills: ['Rigging', 'Slinging', 'Crane Signalling', 'Load Calculation', 'Lifting Plan Execution', 'Banksman', 'Heavy Lift Coordination', 'Tugger Operation', 'Chain Block Operation', 'Lifting Equipment Inspection'],
  },
  {
    emoji: '🏋️',
    name: 'Crane & Heavy Equipment',
    skills: ['Mobile Crane Operation', 'Tower Crane Operation', 'Overhead Crane Operation', 'Knuckle Boom Crane', 'Forklift Operation', 'Telehandler Operation', 'Excavator Operation', 'Bulldozer Operation', 'Reach Stacker', 'Pipelayer Operation'],
  },
  {
    emoji: '⚡',
    name: 'Electrical',
    skills: ['Low Voltage Electrical', 'High Voltage Electrical', 'Instrumentation', 'PLC Programming', 'SCADA Systems', 'Electrical Fault Finding', 'Cable Pulling', 'Termination & Jointing', 'Hazardous Area Electrical (ATEX)', 'Electrical Inspection'],
  },
  {
    emoji: '🔧',
    name: 'Mechanical',
    skills: ['Mechanical Maintenance', 'Pump Maintenance', 'Compressor Maintenance', 'Valve Maintenance', 'Hydraulic Systems', 'Pneumatic Systems', 'Rotating Equipment', 'Diesel Engine Maintenance', 'Gearbox Overhaul', 'Alignment & Balancing'],
  },
  {
    emoji: '🔩',
    name: 'Piping & Pipelines',
    skills: ['Pipefitting', 'Pipeline Installation', 'Pipeline Inspection', 'Pipe Pressure Testing', 'Hot Tapping', 'Pipeline Pigging', 'Subsea Pipeline', 'Flange Management', 'Bolting & Torquing', 'Leak Testing'],
  },
  {
    emoji: '🪜',
    name: 'Scaffolding & Access',
    skills: ['Scaffolding Erection', 'Scaffolding Inspection', 'Rope Access (IRATA)', 'Working at Height', 'Suspended Scaffolding', 'Tube & Fitting Scaffolding', 'System Scaffolding', 'Confined Space Access', 'Swing Stage Operation'],
  },
  {
    emoji: '🦺',
    name: 'HSE & Safety',
    skills: ['HSE Management', 'Risk Assessment', 'Safety Observation', 'Permit to Work', 'LOTO / Isolation', 'Emergency Response', 'Fire Watch', 'Gas Testing', 'Safety Auditing', 'Incident Investigation', 'COSHH Assessment', 'Manual Handling'],
  },
  {
    emoji: '🛢️',
    name: 'Offshore Operations',
    skills: ['Offshore Installation', 'Deck Operations', 'Anchor Handling', 'Dynamic Positioning (DP)', 'Ballast Control', 'Cargo Operations', 'Mooring Operations', 'Helicopter Operations', 'Lifeboat Coxswain', 'GMDSS Radio'],
  },
  {
    emoji: '🚢',
    name: 'Maritime',
    skills: ['Watchkeeping (STCW)', 'Navigation', 'Engine Room Operations', 'Able Seaman', 'Bosun', 'Maritime Firefighting', 'Maritime First Aid', 'Survival Craft', 'Fast Rescue Boat', 'Ship Security'],
  },
  {
    emoji: '🧱',
    name: 'Construction',
    skills: ['Concrete Work', 'Formwork', 'Reinforcement (Rebar)', 'Masonry', 'Carpentry', 'Roofing', 'Insulation', 'Painting & Coating', 'Sandblasting', 'Surface Preparation'],
  },
  {
    emoji: '⚙️',
    name: 'Process & Operations',
    skills: ['Process Operations', 'Control Room Operations', 'Chemical Handling', 'Tank Cleaning', 'Separator Operations', 'Metering Operations', 'Injection Systems', 'Flare Systems', 'Process Safety', 'Shutdown & Turnaround'],
  },
  {
    emoji: '📋',
    name: 'Project & Leadership',
    skills: ['Project Management', 'Site Supervision', 'Team Leadership', 'Planning & Scheduling', 'Cost Control', 'Contract Management', 'Stakeholder Management', 'Report Writing', 'Toolbox Talk Facilitation', 'Crew Coordination'],
  },
  {
    emoji: '💻',
    name: 'IT & Technical',
    skills: ['AutoCAD', '3D Modelling', 'GIS Mapping', 'Data Analysis', 'SAP / ERP Systems', 'Maintenance Management Systems (CMMS)', 'Technical Documentation', 'As-built Documentation', 'P&ID Reading', 'Technical Drawing'],
  },
  {
    emoji: '🩺',
    name: 'First Aid & Medical',
    skills: ['First Aid', 'CPR / AED', 'Offshore Medic', 'Occupational Health', 'Drug & Alcohol Testing', 'Firefighting', 'Evacuation Coordination', 'Trauma Response'],
  },
  {
    emoji: '🤝',
    name: 'Soft Skills',
    skills: ['Communication', 'Teamwork', 'Problem Solving', 'Physical Fitness', 'Adaptability', 'Attention to Detail', 'Time Management', 'Initiative', 'Mentoring', 'Customer Relations'],
  },
];

export const ALL_SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills);
