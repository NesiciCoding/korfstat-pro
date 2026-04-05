import { Drill } from '../types/training';

export const DRILL_LIBRARY: Drill[] = [
  {
    id: 'SHOOT_50_NEAR',
    name: '50 Shots (Short)',
    description: 'Shoot 50 shots from 3-4 meters. Focus on release speed.',
    metricType: 'COUNT',
    target: 40,
    category: 'SHOOTING'
  },
  {
    id: 'SHOOT_50_MEDIUM',
    name: '50 Shots (Medium)',
    description: 'Shoot 50 shots from 5-6 meters. Focus on arc.',
    metricType: 'COUNT',
    target: 35,
    category: 'SHOOTING'
  },
  {
    id: 'PENALTY_10',
    name: '10 Penalties',
    description: 'Take 10 penalty shots. No pressure.',
    metricType: 'COUNT',
    target: 9,
    category: 'SHOOTING'
  },
  {
    id: 'FREE_THROW_10',
    name: '10 Free Passes',
    description: 'Take 10 free passes. Focus on the set-up.',
    metricType: 'COUNT',
    target: 8,
    category: 'SHOOTING'
  },
  {
    id: 'RUNNING_SHIPS_10M',
    name: 'Running In (10x)',
    description: '10 running-in shots with a defender trailing.',
    metricType: 'COUNT',
    target: 7,
    category: 'TECHNICAL'
  },
  {
    id: 'BEEP_TEST',
    name: 'Beep Test',
    description: 'Standard 20m shuttle run fitness test.',
    metricType: 'SECONDS',
    category: 'FITNESS'
  }
];
