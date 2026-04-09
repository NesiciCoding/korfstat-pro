import { TeamId, CardType, ShotType } from '../../types';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  step:
    | 'SELECT_TEAM'
    | 'SELECT_PLAYER'
    | 'SELECT_ACTION'
    | 'SELECT_SHOT_TYPE'
    | 'SELECT_SUB_OUT'
    | 'SELECT_SUB_IN'
    | 'CONFIRM_SUB_EXCEPTION'
    | 'SELECT_CARD_PLAYER'
    | 'SELECT_RESULT'
    | 'SELECT_TEAM_FOR_SUB'
    | 'SELECT_CARD_TYPE'
    | 'SELECT_REF_TYPE'
    | 'SELECT_REF_DECISION';
  selectedTeam?: TeamId;
  selectedPlayerId?: string;
  subOutId?: string;
  subInId?: string;
  cardType?: CardType;
  foulType?: string;
  calculatedShotType?: ShotType;
}

export type PendingAction = 'GOAL' | 'MISS' | 'FREE_THROW' | 'PENALTY' | 'CARD' | 'TURNOVER' | 'FOUL' | 'REBOUND' | null;
export type ActiveModal = 'END_HALF' | 'END_MATCH' | 'BREAK_SETUP' | 'OT_SETUP';
