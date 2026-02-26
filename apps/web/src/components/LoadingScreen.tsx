import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import '../styles/loading.css';

const LOADING_TIPS = [
  "Terminus orbits a stable yellow star in a region nearly devoid of other stellar bodies.",
  "The Ancients vanished without a trace. No bodies. No war damage. Simply... gone.",
  "Verdant Dynamics: 'Sustainability is Profitability' - the green corporation.",
  "Helix Extraction: 'Humanity's Survival Demands Sacrifice' - the pragmatists.",
  "Nexus Frontiers: 'Connecting Worlds, Creating Opportunities' - the moderates.",
  "Anomaly Zones: Regions where reality behaves incorrectly. High risk, high reward.",
  "Maniacs attack anything they perceive, constantly, without regard for self-preservation.",
  "The Luminous Canopy: dense forests where bioluminescence saturates every surface.",
  "The Coastal Shallows: where tides reveal secrets beneath dual moons.",
  "The Scarred Badlands: what's left after everything is taken.",
  "Experience is the only teacher that matters on Terminus.",
  "On Terminus, you are what you do. Your past doesn't matter.",
];

const getStageText = (stage: string, isTeleporting: boolean): string => {
  if (isTeleporting) {
    switch (stage) {
      case 'loading-world':
        return 'Teleporting...';
      case 'spawning':
        return 'Arriving at destination...';
      case 'ready':
        return 'Ready!';
      default:
        return 'Teleporting...';
    }
  }
  switch (stage) {
    case 'connecting':
      return 'Connecting to server...';
    case 'authenticating':
      return 'Authenticating character...';
    case 'loading-world':
      return 'Loading world data...';
    case 'spawning':
      return 'Spawning into world...';
    case 'ready':
      return 'Ready!';
    default:
      return 'Preparing...';
  }
};

export const LoadingScreen: React.FC = () => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const loadingStage = useGameStore((state) => state.loadingStage);
  const loadingProgress = useGameStore((state) => state.loadingProgress);
  const isTeleporting = useGameStore((state) => state.isTeleporting);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-screen">
      <div className="loading-stage-text">{getStageText(loadingStage, isTeleporting)}</div>

      <div className="loading-progress-container">
        <div
          className="loading-progress-bar"
          style={{ width: `${loadingProgress}%` }}
        />
      </div>

      <div className="loading-percentage">{loadingProgress}%</div>

      <div className="loading-tip">{LOADING_TIPS[currentTipIndex]}</div>
    </div>
  );
};
