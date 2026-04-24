import React from 'react';
import { useClub } from '../../contexts/ClubContext';
import UpgradePromptView from './UpgradePromptView';

interface GatedViewProps {
  feature: string;
  featureLabel?: string;
  children: React.ReactNode;
  onBack?: () => void;
}

const GatedView: React.FC<GatedViewProps> = ({ feature, featureLabel, children, onBack }) => {
  const { hasFeature } = useClub();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return <UpgradePromptView feature={feature} featureLabel={featureLabel} onBack={onBack} />;
};

export default GatedView;
